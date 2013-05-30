let console = (Cu.import("resource://gre/modules/devtools/Console.jsm", {})).console;

/*****************************************************************************
 *
 * Statistics drawing utility based on d3.js
 *
 */
function Statistics()
{
  this.status = 1;
  this.container = '';
  this.parsed = '';
  this.firstRecord = {};
  this.dateFormat = d3.time.format("%Y-%m-%d");
}

/**
 * Simple initialization
 *
 */
Statistics.prototype.init = function(container, json)
{
  var self = this;
  self.container = container;
  self.parsed = JSON.parse(json);
  self.firstRecord = JSON.parse(self.parsed.firstRecord);
}

/**
 * Gathers data for most visited sites and calls
 * the bar chart drawing method
 *
 * @param string selector of the destination container
 */
Statistics.prototype.mostVisited = function(container)
{
  var self = this;
  var counts = [];
  var hosts = [];

  self.parsed.mostVisited.forEach(function(value, index, array)
  {
    var parsedElement = JSON.parse(value);
    counts.push(parsedElement.accessCount);
    hosts.push(parsedElement.host);
  });

  // draw a chart
  return this.barGraph(container + ' .bars', counts, hosts);
}

/**
 * Generic bar chart drawer
 *
 * @param string selector of DOM element that will hold the chart
 * @param array with data (numbers)
 * @param array with labels
 */
Statistics.prototype.barGraph = function(container, data, labels)
{
  var x, y;
  var gap = 2;
  var width = 400;
  var bar_height = 20;
  var labelpad = 150;
  var left_width = 10;
  var height = (bar_height + 2 * gap) * data.length + 50;

  x = d3.scale.linear()
  .domain([0, d3.max(data)])
  .range([0, width - 100]);

  y = d3.scale.ordinal()
  .domain(data)
  .rangeBands([0, (bar_height + 2 * gap) * labels.length]);

  var chart = d3.select(container)
  .append('svg:svg')
  .attr('class', 'chart')
  .attr('width', left_width + width + 100)
  .attr('height', height)
  .append('svg:g')
  .attr('transform', 'translate(0, 0)');

  var bars = chart.selectAll('g.bar')
  .data(data)
  .enter().append('svg:g')
  .attr('class', 'bar')
  .attr('transform', function(d, i) {
    return 'translate(' + labelpad + ',' + y(i) + ')';
  });

  bars.append('svg:rect')
  .attr('class', function(d, i) {
    var style = 'odd';
    (i % 2) ? style = 'even' : style = style;
    return style;
  })
  .attr('width', x)
  .attr('height', y.rangeBand());

  bars.append('svg:text')
  .attr('class', 'label')
  .attr('x', -labelpad)
  .attr('y', 10)
  .attr('dx', 2)
  .attr('dy', '.35em')
  .attr('text-anchor', 'start')
  .text(function(d, i) {
    return labels[i];
  });

  bars.append('svg:text')
  .attr('class', 'data')
  .attr('x', width - 60)
  .attr('y', 10)
  .attr('dx', -6)
  .attr('dy', '.35em')
  .attr('text-anchor', 'end')
  .text(function(d, i) {
    return data[i];
  });

  var rules = chart.selectAll('g.rule')
  .data(x.ticks(5))
  .enter().append('svg:g')
  .attr('class', 'rule')
  .attr('transform', function(d) {
    return 'translate(' + x(d) + ', 0)';
  });

  rules.append('svg:line')
  .attr('class', 'long')
  .attr('x1', labelpad)
  .attr('x2', labelpad)
  .attr('y1', 0)
  .attr('y2', height - 30);

  rules.append('svg:text')
  .attr('x', labelpad)
  .attr('y', height - 20)
  .attr('dy', '.71em')
  .attr('text-anchor', 'middle')
  .text(x.tickFormat(5));
}
