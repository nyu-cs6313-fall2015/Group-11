var margin = { top: 150, right: 0, bottom: 100, left: 150 },
          width = 600 - margin.left - margin.right,
          height = 15000 - margin.top - margin.bottom,
          gridSize = Math.floor(width / 25),
          legendElementWidth = gridSize*2,
          buckets = 9,
          colors = ["#042959","#BABABA"], // alternatively colorbrewer.YlGnBu[9]
          datasets = ["datahm.csv"],
            hmData;

function loadHeatMapData(tsvFile) {
        d3.csv('/proxy.php?url='+tsvFile,
        function(d) {
          return {
            leg: d.Legislator,
            org: d['Contributor Interest Group'],
            legVote: getKey(d, 'Vote')== '' ? 'NA': getKey(d, 'Vote'),
            igVote: getKey(d, 'Interest Group') == 'Support' ? true: false,
            money: +d['Contribution Amount'].replace("$", "").replace(",", "").trim(),
            bill: '',
            legVoted: getKey(d, 'Vote') == 'Yes' ? true: false,
            orgSupported: getKey(d, 'Interest Group') == 'Support' ? true: false,
            bothAgree: (getKey(d, 'Vote') == 'Yes' && getKey(d, 'Interest Group') == 'Support') || (getKey(d, 'Vote') == 'No' && getKey(d, 'Interest Group') == 'Oppose') ? true: false
          };
        },
        function(error,data){
          hmData = data;
          loadHeatMapChart(data);
        });
      };

     function loadHeatMapChart(data) {
            legislators = _.uniq(_.pluck(data, 'leg'));
         
         var svg = d3.select("#chart").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .attr("style","overflow:auto")
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var dayLabels = svg.selectAll(".dayLabel")
                                .data(legislators)
                                .enter().append("text")
                                .text(function (d) { return d; })
                                .attr("x", -70)
                                .attr("y", function (d, i) { return i * gridSize; })
                                .style("text-anchor", "end")
                                .attr("transform", "translate(60," + gridSize / 1.5 + ")")
                                .attr("class", function (d, i) { return (( i%2 == 0) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); })

            organization = _.uniq(_.pluck(data, 'org'));

            var timeLabels = svg.selectAll(".timeLabel")
                                .data(organization)
                                .enter().append("text")
                                .text(function(d) { return d; })
                                .attr("x", 0)
                                .attr("dx", 2)
                                .attr("y", 0)
                                .style("text-anchor", "start")
                                .attr("transform", function(d, i) { return "translate(" + ((i * gridSize) + 10) + ", -6) rotate(-60)";} )
                                .attr("class", function(d, i) { return ((i%2 == 0) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

            var colorScale = d3.scale.ordinal()
              .domain(_.uniq(_.pluck(data, 'bothAgree')))
              .range(colors);

          var cards = svg.selectAll(".hour")
              .data(data, function(d) {return d.leg+':'+d.org;});

          cards.append("title");

          cards.enter().append("rect")
              .attr("x", function(d,i) {return (_.indexOf(organization, d.org) * gridSize); })
              .attr("y", function(d,i) { return (_.indexOf(legislators, d.leg) * gridSize); })
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("class", "hour bordered")
              .attr("width", gridSize)
              .attr("height", gridSize)
              .style("fill", colors[0])
              .on('mouseover', function(d){
                    return tooltip.style("visibility", "visible").append("span")
                    .html(" <b>Bill</b> : " + d.bill +
                          "<br> <b>Legislator</b> : " + d.leg +
                          "<br> <b>Did Legislator Vote for Bill?</b> : " + d.legVoted +
                          "<br> <b>Organization</b> : " + d.org +
                          "<br> <b>Did Organization Support the Bill?</b> : " + d.orgSupported +
                          "<br> <b>Did legislator and Orgnaization agree?</b> : " + d.bothAgree +
                          "<br> <b>Money received from Organization</b> : " + d3.format("$,")(d.money))})
              .on('mouseout', function(d){
                    return tooltip.style("visibility", "hidden").selectAll("span").remove();
                })
              .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px")});

          cards.transition().duration(1000)
              .style("fill", function(d) { return colorScale(d.bothAgree); });

          cards.select("title").text(function(d) { return d.bothAgree; });

          cards.exit().remove();

          /*var legend = svg.selectAll(".legend")
              .data([0].concat(colorScale.range()), function(d) { return d; });

          legend.enter().append("g")
              .attr("class", "legend");

          legend.append("rect")
            .attr("x", function(d, i) { return legendElementWidth * i; })
            .attr("y", height)
            .attr("width", legendElementWidth)
            .attr("height", gridSize / 2)
            .style("fill", function(d, i) { return colors[i]; });

          legend.append("text")
            .attr("class", "mono")
            .text(function(d) { return d; })
            .attr("x", function(d, i) { return legendElementWidth * i; })
            .attr("y", height + gridSize);

          legend.exit().remove();*/

        };

function getKey(d,KeyStr)
{
    var cl = _.find(Object.keys(d),function(key){ return _.startsWith(key, KeyStr);});
    return d[cl];
}
      //loadHeatMapData(datasets[0]);
