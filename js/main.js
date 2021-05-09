(function(){

var attrArray = ["1995 Population", "2000 Population", "2005 Population", "2010 Population", "2015 Population", "2020 Population", "1995 Population %",
"2020 Population %", "1995 Life Expectancy (Men)", "1995 Life Expectancy (Women)", "2025 Life Expectancy (Men)", "2025 Life Expectancy (Women)",
"1995 Aged Population %", "2000 Aged Population %", "2005 Aged Population %", "2010 Aged Population %", "2015 Aged Population %", "2020 Aged Population %",
"Estimated 2025 Aged Population %"]; //list of attributes


var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.55,
    chartHeight = 473,
    leftPadding = 60,
    rightPadding = 2,
    topBottomPadding = 5
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, 11774000 * 1.1]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.35,
        height = 580;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Mercator projection centered on Japan
    var projection = d3.geoMercator()
        .center([138, 36])
        //.rotate([0, 0])
        //.parallels([24.6, 43.6])
        .scale(1300)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/JPN.csv")); //load attributes from csv
    promises.push(d3.json("data/jpnprefecture.topojson")); //load choropleth spatial data
    promises.push(d3.json("data/adjacentcountries.topojson"))
    Promise.all(promises).then(callback);

    function callback(data){
      //console.log(error);
      //console.log(csvData);
      //console.log(japan);
      // japanprefecture = topojson.feature(japan, japan.objects.jpnprefecture).features;
      //
      // console.log(japan);
      [csvData, japan, country] = data;
      // csvData = data[0];
  		// japan = data[1];
      // country = data[2]

  		setGraticule(map, path);

  		//translate europe TopoJSON

  		var japanpc = topojson.feature(japan, japan.objects.jpnprefecture).features,
          adjcountries = topojson.feature(country, country.objects.adjacentcountries);

      //add adjacent countries countries to map
      var countries = map.append("path")
  			.datum(adjcountries)
  			.attr("class", "countries")
  			.attr("d", path);

      //join csv data to GeoJSON enumeration units
      japanpc = joinData(japanpc, csvData);
        //create the color scale
      var colorScale = makeColorScale(csvData);

      //add enumeration units to the map
      setEnumerationUnits(japanpc, map, path, colorScale);

      setChart(csvData, colorScale);

      createDropdown(csvData);
      };
    };   //end of set map

function setGraticule(map, path){

        var graticule = d3.geoGraticule()
    			.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    		//create graticule background
    		var gratBackground = map.append("path")
    			.datum(graticule.outline()) //bind graticule background
    			.attr("class", "gratBackground") //assign class for styling
    			.attr("d", path) //project graticule

    		//create graticule lines
    		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    			.data(graticule.lines()) //bind graticule lines to each element to be created
    		  	.enter() //create an element for each datum
    			.append("path") //append each element to the svg as a path element
    			.attr("class", "gratLines") //assign class for styling
    			.attr("d", path); //project graticule lines
    };   // end of setGraticule

function joinData(japanpc, csvData){
        //...DATA JOIN LOOPS FROM EXAMPLE 1.1
        for (var i=0; i<csvData.length; i++){
           var csvRegion = csvData[i]; //the current prefecture
           var csvKey = csvRegion.ADM1_PCODE; //the CSV primary key

         //loop through geojson regions to find correct prefecture
           for (var a=0; a<japanpc.length; a++){

           var geojsonProps = japanpc[a].properties; //the current prefecture geojson properties
           var geojsonKey = geojsonProps.ADM1_PCODE; //the geojson primary key

         //where primary keys match, transfer csv data to geojson properties object
           if (geojsonKey == csvKey){

            //assign all attributes and values
           attrArray.forEach(function(attr){
           var val = parseFloat(csvRegion[attr]); //get csv attribute value
           geojsonProps[attr] = val; //assign attribute and value to geojson properties
                         });
                     };
               };
           };
        return japanpc;
    }; //end of joinData

function setEnumerationUnits(japanpc, map, path, colorScale){
        //...REGIONS BLOCK FROM MODULE 8
        //add Japan prefectures to map
        var regions = map.selectAll(".regions")
            .data(japanpc)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.ADM1_PCODE;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
            highlight(d.currentTarget.__data__.properties)
            })

            .on("mouseout", function(d){
            dehighlight(d.currentTarget.__data__.properties)
            })
            .on("mousemove", moveLabel);
        //below Example 2.2 line 16...add style descriptor to each path
          var desc = regions.append("desc")
               .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    }; //end of setEnumerationUnits

//function to create color scale generator
function makeColorScale(data){
        var colorClasses = [
            "#93c5f5",
            "#5da1e3",
            "#3183d4",
            "#0f50bf",
            "#13478a",
            "#041e4a"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses)
            .unknown("#c2c2c2");

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 6);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    }; // end of creating color scale

function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };// end of choropleth


    //function to create coordinated bar chart
function setChart(csvData, colorScale){

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);


        //set bars for eachprefecture
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.ADM1_PCODE;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(d){
                highlight(d.currentTarget.__data__)
                 })
            .on("mouseout", function(d){
                  dehighlight(d.currentTarget.__data__)
               })
            .on("mousemove", moveLabel);

        //below Example 2.2 line 31...add style descriptor to each rect
        var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 70)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " in each Japanese Prefecture")
            .style('fill', 'white');

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .ticks(10,"s");

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    }; // end of setchart

function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .attr("text-anchor", "middle")
            .text("Select Demographic Data");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    }; //end of createdropdown

    //dropdown change listener handler
function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;


        // change yscale dynamically
        csvmax = d3.max(csvData, function(d) { return parseFloat(d[expressed]); });

        yScale = d3.scaleLinear()
            .range([chartHeight - 10, 0])
            .domain([0, csvmax*1.1]);

        //updata vertical axis
        d3.select(".axis").remove();
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .ticks(10,"s");

        //place axis
        var axis = d3.select(".chart")
            .append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);


        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);
    }; // end of change attribute

    //function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each Japanese Prefecture");
    }; // end of update chart

    //function to highlight enumeration units and bars
function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.ADM1_PCODE)
            .style("stroke", "white")
            .style("stroke-width", "2");

        setLabel(props);
    }; // end of highlight chart

//dehighlight selection
function dehighlight(props){
        var selected = d3.selectAll("." + props.ADM1_PCODE)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        d3.select(".infolabel")

              .remove();
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    }; // end of dehighlight function


    //function to create dynamic label
function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ADM1_PCODE + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.ADM1_EN);
    }; // end of setlabel function


    // move inforlabel with mouse
function moveLabel(event){
        //use coordinates of mousemove event to set label coordinates
        var x = event.clientX - 160,
            y = event.clientY - 95;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }; //end moveLabel()
})(); //last line of main.js
