var projectData;
var spController;
_.mixin({
  'findByValues': function(collection, property, values) {
    return _.filter(collection, function(item) {
      return _.contains(values, item[property]);
    });
  }
});

function collect(dataRow) {

    return {
        billName: (dataRow['Bill Title'] != '' ? dataRow['Bill Title'] : dataRow.Bill),
        moneyGivenInSupport : +dataRow['Money Given in Favor of Bill'].replace("$", "").replace(",", ""),
        moneySpentInOppose : +dataRow['Money Given in against the Bill'].replace("$", "").replace(",", ""),
        billStatus: dataRow['Bill Status'],
        session: +dataRow.Session,
        billType: dataRow['Bill Type'],
        billNum: dataRow['Bill Num'],
        bill: dataRow.Bill
    };
}

function loadCsvData(callback, filename) {
    d3.csv(filename).row(collect).get(function (error, rows) {
        projectData = rows;
        callback();
    });
}

function loadFilter(filterId, filterFn, filterValueFn, dispatcher, filterName)
{
    return {
        init: function() {
            this.list = d3.select(filterId);
        },

        getElement: function(d){
            return this.list.selectAll("option").filter(filterFn);
        },

        onDataUpdate :function(data) {
            this.selection = this.list.selectAll("option").data(data, filterValueFn);
            this.selection.enter().append("option").text(filterValueFn).attr('value', filterValueFn);

            this.selection.on('mouseover', function(d){dispatcher.notify('mouseover',d);});
            this.selection.on('mouseout', function(d){dispatcher.notify('mouseout',d);});
            this.selection.on('mousemove', function(d){dispatcher.notify('mousemove',d);});
            this.selection.on('click', function(d){dispatcher.notify('click',d);});

            this.selection.exit().remove();

            $(function(){
                $(filterId).multipleSelect({
                    placeholder: 'Search',
                    filter: true,
                    onClick:function() {
                        this.filteredData = _.findByValues(data,filterName, $(filterId).multipleSelect('getSelects'));
                        scatterplot.onDataUpdate(this.filteredData);

                    },
                    onCheckAll : function(){
                        scatterplot.onDataUpdate(data);
                    },
                    onUncheckAll :function(){
                        scatterplot.onDataUpdate({});
                    }
                });

                $(filterId).multipleSelect('checkAll');
            });
        },

        mouseover : function(d){},
        mousemove : function(d){},
        mouseout : function(d){},
        click : function(d){}
    };
}
var tooltip = d3.select("body")
                    .append("div")
                    .style("position", "absolute")
                    .style("z-index", "10")
                    .style("visibility", "hidden")
                    .style("border", "1px solid grey")
                    .style("background-color", "white")
                    .style("padding", "10px")
                    .style("color","black");

function loadVisualization() {


    var margin = {top: 15, right: 10, bottom: 70, left: 70},
        width = 530 - margin.left - margin.right,
        height = 530 - margin.top - margin.bottom;

    var spDispatcher = {
        add: function(view){
            if (!this.subscribers){
                this.subscribers = [];
            }
            this.subscribers.push(view);
        },

        notify: function(type, payload){
            this.subscribers.forEach(function(s){
              s[type](payload);
            });
        }
    };

    spController = {
        loadData: function(data){
            this.data = data;
            spDispatcher.notify('onDataUpdate', this.data);
        },

        remove: function(index){
            this.data.splice(index,1);
            spDispatcher.notify('onDataUpdate', this.data);
        },

        filter: function(value) {
            var dt = this.data.filter(function(d){
               return d.name.toLowerCase().indexOf(value.toLowerCase()) > -1;
            });
            spDispatcher.notify('onDataUpdate', dt);
        }
    };

    scatterplot = {
        init: function(width, height, margin) {
            _this=this;
            // setup x
            this.xValue = function(d) { return d.moneyGivenInSupport == 0 ? d.moneyGivenInSupport + 10 : d.moneyGivenInSupport;}; // data -> value
            this.xScale = d3.scale.log().range([0,width]); // value -> display
            this.xMap = function(d) { return this.xScale(this.xValue(d));}.bind(this); // data -> display
            this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom").ticks(5, ",.1s").tickSize(6, 0);//.tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup y
            this.yValue = function(d) { return d.moneySpentInOppose == 0 ? d.moneySpentInOppose + 10 : d.moneySpentInOppose;}; // data -> value
            this.yScale = d3.scale.log().range([height, 0]), // value -> display
            this.yMap = function(d) { return this.yScale(this.yValue(d));}.bind(this), // data -> display
            this.yAxis = d3.svg.axis().scale(this.yScale).orient("left").ticks(5, ",.1s").tickSize(6, 0);//.tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup fill color
            this.cValue = function(d) { return d.billStatus;};
            this.color = d3.scale.category10()
                .range(["#971B83","#D63A32", "#0A417C"]);

            this.svg =d3.select("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // x-axis
            this.xgroup = this.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

            this.xgroup.append("text")
              .attr("class", "label")
              .attr("x", width/2)
              .attr("y", 40)
              .style("text-anchor", "middle")
              .text("Funding From Supporters");

         // y-axis
          this.ygroup = this.svg.append("g")
              .attr("class", "y axis");

            this.ygroup.append("text")
              .attr("class", "label")
              .attr("transform", "rotate(-90)")
              .attr("x", -width/2)
              .attr("y", -60)
              .attr("dy", ".71em")
              .style("text-anchor", "middle")
              .text("Funding From Opposers");

          // diagonal line
          this.diagonal = this.svg.append("line")
            .attr("x1", 450)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 450)
            .attr("stroke-width", 2)
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "2")
            ;
            //this.yScale(300)
        },
        getItem : function(d){ return d3.select('svg').selectAll('circle').filter(function(e){return d.billName == e.billName})},
        mouseover: function(d){
            this.getItem(d).attr("r",8).attr("fill", "black"); return tooltip.style("visibility", "visible").append("span")
                .html(" <b>Bill</b> : " + d.billName + "<br> <b>Bill Status</b> : " + d.billStatus +"<br> <b>Money Given In Support</b> : " + d3.format("$,")(d.moneyGivenInSupport) + "<br> <b>Money Spent In Oppose</b> : " + d3.format("$,")(d.moneySpentInOppose))},

        mouseout: function(d){
            this.getItem(d).attr("r",4).attr("fill", function(d) { return _this.color(_this.cValue(d));} ); return tooltip.style("visibility", "hidden").selectAll("span").remove();
        },

        mousemove: function(d){
         return tooltip.style("top", (+d3.select(this.getItem(d)[0][0]).attr('cy')+160)+"px").style("left",(+d3.select(this.getItem(d)[0][0]).attr('cx')+120)+"px");
        },

        click: function(d){
            d3.select("#chart").selectAll("*").remove();
            loadHeatMapData('http://maplight.org/us-congress/bill/' + d.session + '-' + d.billType + '-' + d.billNum + '/' + d.bill + '/download.csv');
            
            var tooltip = d3.select("#infoDiv").style("visibility", "visible");;

            tooltip.select("#BillName").text(d.billName);
            tooltip.select("#BillStatus").text(d.billStatus);
            tooltip.select("#InSupport").text(d3.format("$,")(d.moneyGivenInSupport));
            tooltip.select("#InOppose").text(d3.format("$,")(d.moneySpentInOppose));
          },


        onDataUpdate: function(data)
        {
            this.xScale.domain([d3.min(data, this.xValue)-1,d3.max(data, this.xValue)+1]);
            this.yScale.domain([d3.min(data, this.yValue)-1,d3.max(data, this.yValue)+1]);
            this.xgroup.transition().call(this.xAxis);
            this.ygroup.transition().call(this.yAxis);

            this.viz = this.svg.selectAll("circle").data(data, function(d){return d.billName;});
            this.viz.enter().append("circle").attr('data-legend', function(d) {
                return d.billStatus;
            }).attr({
            r: 4,
            cx: this.xMap,
            cy: this.yMap,
            fill: function(d) { return _this.color(_this.cValue(d));},
            opacity: 0.6
            });
            this.viz.on("mouseover", function(d) { spDispatcher.notify('mouseover', d) })
            .on("mouseout", function(d) { spDispatcher.notify('mouseout', d) })
            .on("mousemove", function(d) { spDispatcher.notify('mousemove', d) })
            .on("click", this.click)
            .on("contextmenu", function(d, i){
                d3.event.preventDefault();
                tooltip.style("visibility", "hidden").selectAll("span").remove();
                spController.remove(i);
            });

            this.viz.exit().remove();

            this.viz.transition();

            var dataL = 0;
            var offset = 80;


            this.legend = this.svg.append("g")
              .attr("class","legend")
              .attr("transform","translate(360,390)")
              .style("font-size","12px")
              .call(d3.legend);

            setTimeout(function() {
              this.legend = this.svg.append("circle")
                .style("font-size","20px")
                .attr("data-style-padding",10)
                .call(d3.legend)
            },1000);
        }
    };

    var billFilter = loadFilter('#billFilter', function(e, d) {return d.billName == e.billName;}, function(d){return d.billName}, spDispatcher, 'billName');
    var billStatusFilter = loadFilter('#billStatusFilter', function(e, d) {return d.billStatus == e.billStatus;}, function(d){return d.billStatus}, spDispatcher, 'billStatus');
    var billTypeFilter = loadFilter('#billTypeFilter', function(e, d) {return d.billType == e.billType;}, function(d){return d.billType}, spDispatcher, 'billType');
    scatterplot.init(width, height, margin);
    billFilter.init();
    billTypeFilter.init();
    billStatusFilter.init();
    spDispatcher.add(scatterplot);
    spDispatcher.add(billFilter);
    spDispatcher.add(billStatusFilter);
    spDispatcher.add(billTypeFilter);
    spController.loadData(projectData);
}

loadCsvData(loadVisualization, "data.csv");
