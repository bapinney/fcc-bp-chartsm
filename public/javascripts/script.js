console.log("Script loaded");

var stockList; //Globals, for easy debugging...
var socket;
var parEle;
var stocksObj;
var stocksArr = [];
var chartData;

var chart;
var cMargin;
var cWidth;
var cHeight;

var x;
var xAxis;

var y;
var yAxis;
var yDomain;

$(function() { //Document ready
    
    console.log("Fetching symbols...");
    
    $.ajax({
        method: "GET",
        url: "/fetchStocks"
    })
    .done(function(data) {
        console.log(data);
        stocksObj = data;
        var objKeys = Object.keys(data);
        var objLength = objKeys.length;
        for (var i=0; i<objLength; i++) {
            addStock(data[objKeys[i]]);
        }
    });
    
    socket = io.connect('ws://localhost:3000');
    
    socket.on("stockadd", function(stockSymbol) {
        console.log(`Somebody just added a stock: ${stockSymbol}`);
        addStock(stockSymbol);
    });
    
    socket.on("stockremove", function(stockSymbol) {
        console.log(`Somebody just removed a stock: ${stockSymbol}`);
        removeStock(stockSymbol);
    });
    
    var errFlash = function() {
        $("#add_new")[0].style.backgroundColor = "#aa0000";
        setTimeout(function() {
            $("#add_new")[0].removeAttribute("style");
        }, 1000);    
    };
    
    $("#stock_list").on("click", "span.close", function() {
        parEle = this.parentElement;
        var stock2Remove = $(parEle).find(".stock_name")[0].innerText;
        console.log(`Calling stockremove on ${stock2Remove}`);
        socket.emit('stockremove', stock2Remove);
    });
    
    $("#button_add").click(function() {
        if ($("#input_add")[0].value.length == 0) {
            errFlash();
            return false;
        }
        var addedStock = $("#input_add")[0].value;
        
        //addStock(addedStock); Let's instead wait for the emittion message return before adding this stock, since that will get echoed back from the server (and we'll be sure our stock was really added).
        socket.emit('stockadd', addedStock);
        $("#input_add")[0].value = "";
    });
    
    $("#button_draw").click(function() {
        chartInit();
    })
    
    $("#input_add").keypress(function(e) {
        if (e.keyCode === 13) { //Enter key
            $("#button_add")[0].click();
        }
    });
    
    $("#button_fetch").click(function() {
        console.info("%c Refresh clicked...", "color:green;");
        var stockElems = $(".stock_name").contents();
        var stockObj = {};
        var n = 1;
        for (var i=0; i<stockElems.length; i++) {
            stockObj["stock_" + i] = stockElems[i].textContent;
        }
        $.ajax({
            method: "POST",
            data: stockObj,
            url: "fetchCharts"
        })
        .done(function(data) {
            console.log("AJAX DONE");
            console.dir(data);
            chartData = data;
            console.info("%c Chart data copied to chartData", "color:blue; font-size:14px;")
            updateStockStatus();    
        });
    })
    
    //Update the UI feedback for stocks to show if data is pending or ready
    var updateStockStatus = function() {
        console.log("updateStockStatus called...");
        for (var i=0; i<$(".stock_name").length; i++) {
            var curSymbol = $(".stock_name")[i].innerText;
            console.log(`curSymbol is ${curSymbol}`);
            
            //We have the symbol and results
            if (chartData.hasOwnProperty(curSymbol) &&
                chartData[curSymbol].length > 0) 
            {
                $($(".stock_name")[i].parentElement).removeClass("data_pending").addClass("data_ready");
            }
            
            //We have the symbol, but no data was returned
            if (chartData.hasOwnProperty(curSymbol) &&
                chartData[curSymbol].length === 0) 
            {
                $($(".stock_name")[i].parentElement).removeClass("data_pending").addClass("data_unavailable");
            }
        }
    };

    var addStock = function(symbol) {
        if (stocksArr.indexOf(symbol) !== -1) {
            console.info(`Stock ${symbol} already added.`);
            return false; 
        }
        var newDiv = $('<div class="col-md-4"></div>');
        newDiv.append('<span class="close">x</span>');
        var stockDiv = $('<div class="stock_name"></div>');
        stockDiv[0].innerText = symbol;
        newDiv.append(stockDiv);
        if (
            typeof chartData == "undefined" ||
            !chartData.hasOwnProperty(symbol) ||
            chartData[symbol].length == 0
           )
        {
            newDiv.addClass("data_pending");
        }
        else {
            newDiv.addClass("data_ready");            
        }
        $('#stock_list').append(newDiv);
        updateStockList();
    };
    
    var removeStock = function(symbol) {
        $(`.stock_name:contains(${symbol})`)[0].parentElement.remove();
    }
    
    var updateStockList = function() {
        stocksArr = [];
        var stockList = $(".stock_name");
        for (var i=0; i < stockList.length; i++) {
            stocksArr.push(stockList[i].innerText);
        }
    };
    
    
    
    //chartInit();
    
});

var yDomain = [0, 100];
var tickerSymbols;
var yMin;
var yMax;
var interval;
var intervalMultiple;
var stockLine;

var chartInit = function() {
    console.log("chartInit called");
    console.info("D3 version is " + d3.version);

    console.log("Checking for chartData...");
    if (
        typeof chartData == "object" &&
        Object.keys(chartData).length > 1
       ) 
    {
        console.log("%c chartData is defined with 1 or more keys", "color:green;");
    }
    else {
        console.error("%c chartData is not defined with 1 or more keys.  Unable to chartInit().", "color:red; font-size:16px;");
        return false;
    }
    
    console.log("Compiling X domain...");
    var fromDate = new Date(chartData[Object.keys(chartData)[0]][0].date);
    var toDate = new Date(chartData[Object.keys(chartData)[0]][(chartData[Object.keys(chartData)[0]].length - 1)].date);
    var xDomain = [fromDate, toDate];
    console.dir(xDomain);
    
    console.log("Compiling Y domain...");
    tickerSymbols = Object.keys(chartData);
    
    //Init with the first values in the first stock, and go from there...
    var yMin = chartData[tickerSymbols[0]][0].low;
    var yMax = chartData[tickerSymbols[0]][0].high;    
    console.log(`yMin is ${yMin} and yMax is ${yMax}`);
    
    for (var i=0; i<tickerSymbols.length; i++) {
        console.log(`At symbol ${tickerSymbols[i]}`);
        var symLength = chartData[tickerSymbols[i]].length;
        //console.log(`symLength is ${symLength}`);
        for (var i2=0; i2<symLength; i2++) {
            if(chartData[tickerSymbols[i]][i2].low < yMin) {
                yMin = chartData[tickerSymbols[i]][i2].low;
            }
            if(chartData[tickerSymbols[i]][i2].high > yMax) {
                yMax = chartData[tickerSymbols[i]][i2].high;
            }
        }
    }
    
    console.log(`yMin is ${yMin} and yMax is ${yMax}`);
    
    var intervalMultiple = 25; //Means that intervals should be in multiples of 25 (e.g., 25, 50, 75, etc...)
    
    var interval = intervalMultiple * Math.ceil((yMax/yMin)/intervalMultiple);
    
    console.log(`interval is ${interval}`);
    
    if (yMin < interval) {
        var yStart = 0;
    }
    else {
        var yStart = Math.floor(yMin/interval) * interval;
    }
    
    var yEnd = interval*10;
    
    console.log(`yStart is ${yStart} and yEnd is ${yEnd}`);
    
    yDomain = [yStart, yEnd];
    
    console.log(`yDomain is ${yDomain}`);
    
    $("#chart").empty();
    
    chart = $("#chart")[0];
    console.dir(chart);

    //Margins, which we'll subtract from the 'c'ontainer dimensions defined in CSS
    var cMargin = {top: 20, right: 20, bottom: 10, left: 50};
    cHeight = chart.clientHeight - cMargin.top - cMargin.bottom;
    cWidth = chart.clientWidth - cMargin.left - cMargin.right;

    //d3.time.scale() in v3 is d3.scaleTime() in v4
    console.log("D3.time is " + typeof d3.scaleTime);

    x = d3.scaleTime().domain(xDomain).range([0, cWidth]);
    //x.ticks(5);
    //x.tickFormat("s");
    
    xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d"));

    y = d3.scaleLinear().domain(yDomain).range([cHeight, 0]);
    yAxis = d3.axisLeft(y);
    
    //Remember, in D3v4, it is d3.line and NOT d3.svg.line
    stockLine = d3.line()
        .x(function(d) {
            return x(d.date);
        })
        .y(function(d) {
            return y(d.close);
        })

    //Remember, you have to use .append on D3 selections, in order for it to work correctly...

    // *** X ***
    d3.select(chart).append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + cMargin.left + "," + cHeight + ")")
        .call(xAxis);

    // *** Y ***
    d3.select(chart).append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (cMargin.left) + ", " + (0) + ")")
        .call(yAxis);
    
    d3.select(chart).append("path")
    .datum(chartData[0])
    .attr("class", "line")
    .attr("d", stockLine);

};
