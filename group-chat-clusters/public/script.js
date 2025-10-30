document.getElementById("graphForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const n = parseInt(document.getElementById("n").value);
  const edgesText = document.getElementById("edges").value;
  const edges = edgesText.split(",").map(pair => {
    const [u, v] = pair.trim().split(" ").map(Number);
    return [u, v];
  });

  const res = await fetch("/analyze", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ n, edges })
  });

  const data = await res.json();
  document.getElementById("summary").innerText = 
    `Total Friend Groups: ${data.components}`;

  drawGraph(data);
});

function drawGraph(data) {
  const svg = d3.select("#graph");
  svg.selectAll("*").remove(); // clear old graph

  const width = 900, height = 600;
  svg.attr("width", width).attr("height", height);

  // Color scale for groups
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Create a zoomable group
  const container = svg.append("g");

  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Draw links
  const link = container.append("g")
    .attr("stroke", "#aaa")
    .selectAll("line")
    .data(data.links)
    .enter().append("line")
    .attr("stroke-width", 2);

  // Draw nodes
  const node = container.append("g")
    .selectAll("circle")
    .data(data.nodes)
    .enter().append("circle")
    .attr("r", 10)
    .attr("fill", d => color(d.group))
    .style("cursor", "grab")
    .call(drag(simulation));

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "5px 10px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "6px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
    .style("opacity", 0);

  node.on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<b>Student:</b> ${d.id}<br><b>Group:</b> ${d.group}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Node labels
  const label = container.append("g")
    .selectAll("text")
    .data(data.nodes)
    .enter().append("text")
    .text(d => d.id)
    .attr("font-size", 12)
    .attr("dy", 4)
    .attr("text-anchor", "middle");

  // Zoom + Pan
  const zoom = d3.zoom()
    .scaleExtent([0.3, 5])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });
  svg.call(zoom);

  // Simulation tick
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  // Add color legend (group → color)
  const legend = svg.append("g")
    .attr("transform", "translate(20, 20)");

  const groups = [...new Set(data.nodes.map(d => d.group))];

  legend.selectAll("rect")
    .data(groups)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 25)
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(groups)
    .enter()
    .append("text")
    .attr("x", 30)
    .attr("y", (d, i) => i * 25 + 15)
    .text(d => `Group ${d}`)
    .attr("font-size", 14);
}

// Dragging behavior
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}
