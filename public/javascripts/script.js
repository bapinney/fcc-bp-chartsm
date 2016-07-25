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

var ttWidth = 50; //Tooltip width
var ttHeight = 50;

var x;
var xAxis;

var y;
var yAxis;
var yDomain;

$(function() { //Document ready
    
    $('.tooltip-wrapper').tooltip(); //Turn on Bootstrap tooltips...
    
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
    
    var sioConStr = document.location.protocol + "//" + document.location.host;
    
    socket = io.connect(sioConStr);
    
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
        $("#sd_warning")[0].style.display = "none";
        $("#chart")[0].style.display = "block";
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
                allowDraw();
                
            }
            
            //We have the symbol, but no data was returned
            if (chartData.hasOwnProperty(curSymbol) &&
                chartData[curSymbol].length === 0) 
            {
                $($(".stock_name")[i].parentElement).removeClass("data_pending").addClass("data_unavailable");
            }
        }
    };
    
    var allowDraw = function() {
        $("#draw_warning").removeClass("disabled");
        $("#button_draw").removeAttr("disabled");
        //Removes the Bootstrap tooltip warning a chart cannot be drawn before data is fetched
        $('#draw_warning').tooltip('disable');
    }

    var addStock = function(symbol) {
        if (stocksArr.indexOf(symbol) !== -1) {
            console.info(`Stock ${symbol} already added.`);
            return false; 
        }
        var newDiv = $('<div class="col-md-4"></div>');
        newDiv.append('<span class="close">x</span>');
        var stockDiv = $('<div class="stock_name"></div>');
        stockDiv[0].innerText = symbol;
        stockDiv[0].dataset.snid = symbol; //SNID = Stock Name ID, stored in HTML5 data-* attr
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
        var symIndex = stocksArr.indexOf(symbol);
        console.log(typeof symIndex);
        if (typeof symIndex == "number") {
            console.log(`Removed ${symbol} from stocksArr`);
            stocksArr.splice(symIndex, 1);
        }
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

var colors;
var yDomain = [0, 100];
var tickerSymbols;
var yMin;
var yMax;
var interval;
var intervalMultiple;
var stockLine;

var tooltip; //Remove when done testing and place inside code...

var chartInit = function() {
    console.log("chartInit called");
    console.info("D3 version is " + d3.version);

    console.log("Checking for chartData...");
    if (
        typeof chartData == "object" &&
        Object.keys(chartData).length > 0
       ) 
    {
        console.log("%c chartData is defined with 1 or more keys", "color:green;");
    }
    else {
        console.error("%c chartData is not defined with 1 or more keys.  Unable to chartInit().", "color:red; font-size:16px;");
        return false;
    }
    
    colors = d3.scaleOrdinal(d3.schemeCategory10);
    
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
    console.log(`INITIAL yMin is ${yMin} and yMax is ${yMax}`);
    
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
    
    console.log(`FINAL yMin is ${yMin} and yMax is ${yMax}`);
    
    var intervalMultiple = 5; //Means that intervals should be in multiples of 25 (e.g., 25, 50, 75, etc...)
    
    var interval = intervalMultiple * Math.ceil((yMax/yMin)/intervalMultiple);
    
    console.log(`interval is ${interval}`);
    
    if (yMin < interval) {
        var yStart = 0;
    }
    else {
        var yStart = Math.floor(yMin/interval) * interval;
    }
    
    //var yEnd = yStart + (interval*11);
    var yEnd = Math.ceil(yMax/interval) * interval;
    
    console.log(`yStart is ${yStart} and yEnd is ${yEnd}`);
    
    yDomain = [yStart, yEnd];
    
    console.log(`yDomain is ${yDomain}`);
    
    $("#chart").empty();
    
    //chart = $("#chart")[0];
    chart = d3.select("#chart");
    console.dir(chart);

    var chartDOM = $("#chart")[0];
    //Margins, which we'll subtract from the 'c'ontainer dimensions defined in CSS
    var cMargin = {top: 20, right: 20, bottom: 10, left: 50};
    cHeight = chartDOM.clientHeight - cMargin.top - cMargin.bottom;
    cWidth = chartDOM.clientWidth - cMargin.left - cMargin.right;
    console.log(`cHeight is ${cHeight} and cWidth is ${cWidth}`);
    
    //d3.time.scale() in v3 is d3.scaleTime() in v4
    x = d3.scaleTime().domain(xDomain).range([0, cWidth]);
    //x.ticks(5);
    //x.tickFormat("s");
    
    xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d"));

    y = d3.scaleLinear().domain(yDomain).range([cHeight, 0]);
    yAxis = d3.axisLeft(y);
    
    //Remember, in D3v4, it is d3.line and NOT d3.svg.line
    stockLine = d3.line()
    .x(function(d) {
        return x(new Date(d.date));
    })
    .y(function(d) {
        return y(d.close);
    });

    //Remember, you have to use .append on D3 selections, in order for it to work correctly...

    // *** X ***
    chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + cMargin.left + "," + cHeight + ")")
        .call(xAxis);

    // *** Y ***
    chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (cMargin.left) + ", " + (0) + ")")
        .call(yAxis);
    

    var fetchCol = function(stockSym, x0) {
        var xDate = new Date(x0);
        if (typeof chartData[stockSym] !== "undefined") {
            for (var i=0; i < chartData[stockSym].length; i++) {
                if (new Date(chartData[stockSym][i].date) > xDate) {
                    return chartData[stockSym][i];
                }
            }
        }
    };
    
    /**
     * Provide UI feedback to the end-user on the stock he/she moused over on the chart
     */
    var stockAddUIFeedback = function() {
        //D3 binds to the DOM the data it used to graph the selected element.  If we crawl back up to the __data__ property, we can determine which stock symbol the user is hovering over in the chart
        var stockSym = d3.select(this)._groups[0][0]["__data__"][0].symbol;
        var stockEle = $('[data-snid="' + stockSym + '"]')[0].parentElement;
        tooltip.select("#tt_stocksym").text(stockSym);
        $(stockEle).addClass("stockline_hover");
    };
    
    var stockRemoveUIFeedback = function() {
        //D3 binds to the DOM the data it used to graph the selected element.  If we crawl back up to the __data__ property, we can determine which stock symbol the user is hovering over in the chart
        var stockSym = d3.select(this)._groups[0][0]["__data__"][0].symbol;
        var stockEle = $('[data-snid="' + stockSym + '"]')[0].parentElement;
        $(stockEle).removeClass("stockline_hover");
        tooltip.style("display", "none");
    };
    
    var stockTooltipFeedback = function() {
        //This is the "X" value the cursor is hovered over.  Remember, from chartInit(), these are Date objects
        var x0 = d3.mouse(this)[0];
        var y0 = d3.mouse(this)[1];
        var yd;
        if (y0 < $("#chart")[0].height.baseVal.value/2) {
            yd = y0+15;
        }
        else {
            yd = y0-60;
        }
        console.dir(d3.mouse(this));
        tooltip.style("display", "block"); //Makes visible, if hidden before
        tooltip.attr("transform", "translate(" + x0 + ", " + (yd) + ")");        
        var stockSym = d3.select(this)._groups[0][0]["__data__"][0].symbol;
        var x0 = x.invert(d3.mouse(this)[0]);
        var col = fetchCol(stockSym, x0);
        console.dir(col);
        var date = new Date(col.date);
        var dateText = (date.getMonth() + 1) + "/" + date.getDate();
        var ocText = "Op:" + parseFloat(col.open).toFixed(2) + " Cl:" + parseFloat(col.close).toFixed(2);
        tooltip.select("#tt_date").text(dateText);
        tooltip.select("#tt_oc").text(ocText);
        //console.log(x0);
    }
    
    
    console.log("Drawing paths for stocks...");
    
    for (var i=0; i<tickerSymbols.length; i++) {
        if (chartData[tickerSymbols[i]].length > 0) {
            console.log("Drawing line " + (i + 1 + "..."));
            chart.append("path")
            .datum(chartData[tickerSymbols[i]])
            .attr("class", "stock_line")
            
            //Remember, we need to do a transform on the data, since everything else is also translated +50 on the xAxis
            .attr("transform", "translate("+ (cMargin.left) + ", " + (0) + ")")
            .attr("d", stockLine)
            .style("stroke", function(d) { return colors(i); })
            .on("mouseover", stockAddUIFeedback)
            .on("mouseout", stockRemoveUIFeedback)
            .on("mousemove", stockTooltipFeedback);
        }
    }
    
    // *** Info Tooltip ***
    tooltip = chart.append("g").attr("style", "display: none;");
    tooltip.append("rect")
        .attr("class", "hover_tip")
        .attr("width", ttWidth)
        .attr("height", ttHeight)
        .attr("rx", "20")
        .attr("ry", "20");
    tooltip.append("text")
        .attr("class", "hover_tiptext")
        .attr("id", "tt_stocksym")
        .attr("fill", "#000")
        .attr("dx", "1em")
        .attr("dy", "1em");
    tooltip.append("text")
        .attr("class", "hover_tiptext")
        .attr("id", "tt_date")
        .attr("fill", "#000")
        .attr("dx", "1em")
        .attr("dy", "2em");
    tooltip.append("text")
        .attr("class", "hover_tiptext")
        .attr("id", "tt_oc")
        .attr("fill", "#000")
        .attr("dx", "1em")
        .attr("dy", "3em");
};
