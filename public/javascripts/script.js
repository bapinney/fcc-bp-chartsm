console.log("Script loaded");

var stockList; //Global, for easy debugging...
var socket;


$(function() {
    
    socket = io.connect('ws://localhost:3000');
    
    socket.on("stockadd", function(stockSymbol) {
        console.log(`Somebody just added a stock: ${stockSymbol}`);
        addStock(stockSymbol);
    });
    
    socket.on("stockremove", function(stockSymbol) {
        console.log(`Somebody just removed a stock: ${stockSymbol}`);
        //removeStock(stockSymbol);
    });
    
    var errFlash = function() {
        $("#add_new")[0].style.backgroundColor = "#aa0000";
        setTimeout(function() {
            $("#add_new")[0].removeAttribute("style");
        }, 1000);    
    };
    
    $("#button_add").click(function() {
        if ($("#input_add")[0].value == 0) {
            errFlash();
            return false;
        }
        var addedStock = $("#input_add")[0].value;
        //addStock(addedStock); Let's instead wait for the emittion message return before adding this stock, since that will get echoed back from the server.
        socket.emit('stockadd', addedStock);
        $("#input_add")[0].value = "";
    });
    
    $("#input_add").keypress(function(e) {
        if (e.keyCode === 13) {
            $("#button_add")[0].click();
        }
    });
    
    $(document).on("click", ".close", function(e) {
        var div2Close = e.target.parentElement;
        $(div2Close).remove();
        updateStockList();
    });
    
    var addStock = function(symbol) {
        var newDiv = $('<div class="col-md-4"></div>');
        newDiv.append('<span class="close">x</span>');
        var stockDiv = $('<div class="stock_name"></div>');
        stockDiv[0].innerText = symbol;
        newDiv.append(stockDiv);
        $('#stock_list').append(newDiv);
        updateStockList();
    };
    
    var updateStockList = function() {
        stockList = $(".stock_name").contents();
    };
    
});