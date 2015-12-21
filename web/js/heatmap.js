var margin = { top: 40, right: 20, bottom: 100, left: 70 },
          width = 500 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

function loadHeatMapData(tsvFile) {
        d3.csv('/proxy.php?url='+tsvFile,
        function(d) {
          return {
            leg: d.Legislator,
            ig: d['Contributor Interest Group'],
            party: d.Party,
            legVote : getKey(d, 'Vote')== '' ? 'Yes': getKey(d, 'Vote'),
            money: +d['Contribution Amount'].replace("$", "").replace(",", "").trim(),
            igSupported: getKey(d, 'Interest Group')
          };
        },
        function(error,data){
          transformData(data);
        });
      };

function transformData(data)
{
    var res = alasql('SELECT leg, party, legVote, igSupported, sum(money) as money \
                        FROM ? \
                        GROUP BY leg, party, legVote, igSupported \
                        ORDER BY leg ASC',[data]);

    var supported = _.filter(res,{'igSupported': 'Support'});
    var opposed = _.filter(res,{'igSupported': 'Oppose'});


    var fres = alasql('SELECT COALESCE(Supported.leg,Opposed.leg) as leg, COALESCE(Supported.party,Opposed.party) as party, COALESCE(Supported.legVote,Opposed.legVote) as legVote, COALESCE(Supported.money,0) as moneyGivenInSupport, COALESCE(Opposed.money,0) as moneySpentInOppose \
                        FROM ? AS Supported OUTER JOIN ? AS Opposed on Supported.leg = Opposed.leg \
                        ORDER BY 1 ASC',[supported, opposed]);

    sc(width, height, margin, fres);

}

function sc(width, height, margin, data)
{
    var scatterplot2 = {
        init: function(width, height, margin) {
            _this=this;
            // setup x
            this.xValue = function(d) { return d.moneyGivenInSupport == 0 ? d.moneyGivenInSupport + 0 : d.moneyGivenInSupport;}; // data -> value
            this.xScale = d3.scale.linear().range([0,width]); // value -> display
            this.xMap = function(d) { return this.xScale(this.xValue(d));}.bind(this); // data -> display
            this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom").tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup y
            this.yValue = function(d) { return d.moneySpentInOppose == 0 ? d.moneySpentInOppose + 0 : d.moneySpentInOppose;}; // data -> value
            this.yScale = d3.scale.linear().range([height, 0]), // value -> display
            this.yMap = function(d) { return this.yScale(this.yValue(d));}.bind(this), // data -> display
            this.yAxis = d3.svg.axis().scale(this.yScale).orient("left").tickFormat(function(d){return "$" + +d/1000 + "k"});

            // setup fill color
            this.cValue = function(d) { return d.legVote;};
            this.color = d3.scale.category10()
                .range(["#D63A32", "#0A417C"]);

            this.svg =d3.select("#chart").append("svg")
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
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 100)
            .attr("y2", 100)
            .attr("stroke-width", 2)
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "2")
            ;

        },
        getItem : function(d){ return this.svg.selectAll('circle').filter(function(e){return d.leg == e.leg})},
        mouseover: function(d){
            this.getItem(d).attr("r",8).attr("fill", "black"); return tooltip.style("visibility", "visible").append("span")
                .html(" <b>Legislator</b> : " + d.leg + "<br> <b>Party</b> : " + d.party +"<br> <b>Money Given In Support</b> : " + d3.format("$,")(d.moneyGivenInSupport) + "<br> <b>Money Spent In Oppose</b> : " + d3.format("$,")(d.moneySpentInOppose))},

        mouseout: function(d){
            this.getItem(d).attr("r",4).attr("fill", function(d) { return _this.color(_this.cValue(d));} ); return tooltip.style("visibility", "hidden").selectAll("span").remove();
        },

        mousemove: function(d){
         return tooltip.style("top", (+d3.select(this.getItem(d)[0][0]).attr('cy')+160)+"px").style("left",(+d3.select(this.getItem(d)[0][0]).attr('cx')+820)+"px");
        },

        onDataUpdate: function(data)
        {
            this.xScale.domain([d3.min(data, this.xValue)-1,d3.max(data, this.xValue)+1]);
            this.yScale.domain([d3.min(data, this.yValue)-1,d3.max(data, this.yValue)+1]);
            this.xgroup.transition().call(this.xAxis);
            this.ygroup.transition().call(this.yAxis);

            this.viz = this.svg.selectAll("circle").data(data, function(d){return d.leg;});
            this.viz.enter().append("circle").attr('data-legend', function(d) {
                return d.legVote;
            }).attr({
            r: 4,
            cx: this.xMap,
            cy: this.yMap,
            fill: function(d) { return _this.color(_this.cValue(d));},
            opacity: 0.6
            });
            this.viz.on("mouseover", function(d) { _this.mouseover(d); })
            .on("mouseout", function(d) { _this.mouseout(d); })
            .on("mousemove", function(d) { _this.mousemove(d) })

            this.viz.exit().remove();

            this.viz.transition();

            var dataL = 0;
            var offset = 80;


            this.legend = this.svg.append("g")
              .attr("class","legend")
              .attr("transform","translate(360,390)")
              .style("font-size","12px")
              .call(d3.legend);

            /*setTimeout(function() {
              this.legend = _this.svg.append("circle")
                .style("font-size","20px")
                .attr("data-style-padding",10)
                .call(d3.legend)
            },1000);*/
        }
    };

    scatterplot2.init(width, height, margin);
    scatterplot2.onDataUpdate(data);
}


function getKey(d,KeyStr)
{
    var cl = _.find(Object.keys(d),function(key){ return _.startsWith(key, KeyStr);});
    return d[cl];
}
