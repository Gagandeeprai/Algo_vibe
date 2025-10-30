document.getElementById("graphForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const n = parseInt(document.getElementById("n").value);
  const edgesText = document.getElementById("edges").value;
  const edges = edgesText.split(",").map(pair => {
    const [u, v] = pair.trim().split(" ").map(Number);
    return [u, v];
  });

  const response = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n, edges })
  });
  
  const data = await response.json();
  document.getElementById("summary").innerText = 
    `Total Friend Groups: ${data.components}`;

  drawGraph(data);
});

function drawGraph(data) {
  const svg = d3.select("#graph");
  svg.selectAll("*").remove();

  const width = 900, height = 600;
  svg.attr("width", width).attr("height", height);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .attr("stroke", "#aaa")
    .selectAll("line")
    .data(data.links)
    .enter().append("line");

  const node = svg.append("g")
    .selectAll("circle")
    .data(data.nodes)
    .enter().append("circle")
    .attr("r", 10)
    .attr("fill", d => color(d.group))
    .call(drag(simulation));

  const label = svg.append("g")
    .selectAll("text")
    .data(data.nodes)
    .enter().append("text")
    .text(d => d.id)
    .attr("font-size", 12)
    .attr("dy", 4)
    .attr("text-anchor", "middle");

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
}
