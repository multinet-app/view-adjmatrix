/* The View displays the data given to it by the model. */
import { ScaleLinear, scaleLinear, scaleOrdinal, ScaleBand } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { select, selectAll } from 'd3-selection';
import { min, max, range } from 'd3-array';
import { axisTop } from 'd3-axis';
import { superGraph } from '@/lib/aggregation';
import 'science';
import 'reorder.js';
import { Link, Network, Node, Cell, State } from '@/types';

// This is to be removed (stop-gap solution to superGraph network update)
import { eventBus } from '@/components/Controls.vue';

declare const reorder: any;

export class View {
  public visualizedAttributes: string[] = [];
  public enableGraffinity: boolean;

  private network: Network;
  private icons: { [key: string]: { [d: string]: string } } = {
    quant: {
      d:
        'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z',
    },
    alphabetical: {
      d:
        'M401.1,331.2h-189c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.8C407.7,334.2,404.8,331.2,401.1,331.2z M223.7,344.3H266c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-42.3V344.3z M223.7,373H300c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-76.3V373.7z M263.6,447.8c0,2-1.6,3.6-3.6,3.6h-36.4v-18.8H260c2,0,3.6,1.6,3.6,3.6V447.8z M321.5,418.4c0,2-1.6,3.6-3.6,3.6h-94.2v-18.8h94.2c2,0,3.6,1.6,3.6,3.6V418.4z M392.6,449.5h-34.3V442l22.6-27h-21.7v-8.8h33.2v7.5l-21.5,27h21.7V449.5z M381,394.7l-3.7,6.4l-3.7-6.4h2.7v-14.6h2v14.6H381z M387,380l-3.4-9.7h-13.5l-3.3,9.7h-10.2l15.8-43.3h9l15.8,43.3H387z M371.8,363.4H382l-5.1-15.3L371.8,363.4z',
    },
    categorical: {
      d:
        'M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.4C407.7,333.7,404.7,330.7,401,330.7z M272.9,374.3h-52.4v-17.1h52.4V374.3z M272.9,354h-52.4v-17h52.4V354z M332.1,414.9h-52.4v-17h52.4V414.9z M332.1,394.6h-52.4v-17h52.4V394.6z M394.8,456.5h-52.4v-17h52.4V456.5z M394.8,434.9h-52.4v-17h52.4V434.9z',
    },
    cellSort: {
      d:
        'M115.3,0H6.6C3,0,0,3,0,6.6V123c0,3.7,3,6.6,6.6,6.6h108.7c3.7,0,6.6-3,6.6-6.6V6.6C122,3,119,0,115.3,0zM37.8,128.5H15.1V1.2h22.7V128.5z',
    },
  };
  private sortKey = 'name';
  private edges: any;
  private attributeRows: any;
  private order: any;
  private attributes: any;
  private orderingScale: ScaleBand<number>;
  public colorScale: ScaleLinear<string, number> = scaleLinear<
    string,
    number
  >();
  private edgeScales!: { [key: string]: any };
  private columnHeaders: any;
  private attributeScales: { [key: string]: any } = {};
  private colMargin = 5;
  private provenance: any;
  private isMultiEdge = false;
  private selectedNodesAndNeighbors: { [key: string]: string[] } = {};
  private selectedElements: { [key: string]: string[] } = {};
  private mouseOverEvents: any;

  constructor(
    network: Network,
    visualizedAttributes: string[],
    enableGraffinity: boolean,
    orderingScale: ScaleBand<number>,
    columnHeaders: any,
    edges: any,
    attributes: any,
    attributeRows: any,
    provenance: any,
  ) {
    this.network = network;
    this.provenance = provenance;
    this.visualizedAttributes = visualizedAttributes;
    this.enableGraffinity = enableGraffinity;
    this.orderingScale = orderingScale;
    this.columnHeaders = columnHeaders;
    this.edges = edges;
    this.attributes = attributes;
    this.attributeRows = attributeRows;
  }

  public updateAttributes(): void {
    // Set the column widths and margin
    const attrWidth = parseFloat(select('#attributes').attr('width'));
    const colWidth =
      attrWidth / this.visualizedAttributes.length - this.colMargin;

    // Update the column headers
    const columnHeaderGroups = this.columnHeaders
      .selectAll('text')
      .data(this.visualizedAttributes);

    columnHeaderGroups.exit().remove();

    columnHeaderGroups
      .enter()
      .append('text')
      .merge(columnHeaderGroups)
      .style('font-size', '14px')
      .style('text-transform', 'capitalize')
      .style('word-wrap', 'break-word')
      .attr('text-anchor', 'left')
      .attr('transform', 'translate(0,-65)')
      .attr('cursor', 'pointer')
      .text((d: string) => d)
      .attr('y', 16)
      .attr('x', (d: string, i: number) => (colWidth + this.colMargin) * i)
      .attr('width', colWidth)
      .on('click', (d: string) => {
        if (this.enableGraffinity) {
          this.network = superGraph(this.network.nodes, this.network.links, d);
          eventBus.$emit('updateNetwork', this.network);
        } else {
          this.sort(d);
        }
      });

    // Calculate the attribute scales
    this.visualizedAttributes.forEach((col: string) => {
      if (this.isQuantitative(col)) {
        const minimum =
          min(this.network.nodes.map((node: Node) => node[col])) || '0';
        const maximum =
          max(this.network.nodes.map((node: Node) => node[col])) || '0';
        const domain = [parseFloat(minimum), parseFloat(maximum)];

        const scale = scaleLinear().domain(domain).range([0, colWidth]);
        scale.clamp(true);
        this.attributeScales[col] = scale;
      } else {
        const values: string[] = this.network.nodes.map(
          (node: Node) => node[col],
        );
        const domain = [...new Set(values)];
        const scale = scaleOrdinal(schemeCategory10).domain(domain);

        this.attributeScales[col] = scale;
      }
    });

    selectAll('.attr-axis').remove();

    // Add the scale bar at the top of the attr column
    this.visualizedAttributes.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        this.attributes
          .append('g')
          .attr('class', 'attr-axis')
          .attr(
            'transform',
            `translate(${(colWidth + this.colMargin) * index},-15)`,
          )
          .call(
            axisTop(this.attributeScales[col])
              .tickValues(this.attributeScales[col].domain())
              .tickFormat((d: any) => {
                if (d / 1000 >= 1) {
                  d = Math.round(d / 1000) + 'K';
                }
                return parseFloat(d).toFixed(4);
              }),
          )
          .selectAll('text')
          .style('text-anchor', (d: any, i: number) =>
            i % 2 ? 'end' : 'start',
          );
      }
    });

    selectAll('.glyph').remove();
    /* Create data columns data */
    this.visualizedAttributes.forEach((col: string, index: number) => {
      if (this.isQuantitative(col)) {
        this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('height', this.orderingScale.bandwidth())
          .attr('width', (d: Node) => this.attributeScales[col](d[col]))
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0) // y is set by translate on the group
          .attr('fill', '#82b1ff')
          .attr('cursor', 'pointer')
          .on('mouseover', (d: Node) => this.hoverNode(d.id))
          .on('mouseout', (d: Node) => this.unHoverNode(d.id))
          .on('click', (d: Node) => {
            this.selectElement(d);
            this.selectNeighborNodes(d.id, d.neighbors);
          });
      } else {
        this.attributeRows
          .append('rect')
          .attr('class', 'glyph ' + col)
          .attr('x', (colWidth + this.colMargin) * index)
          .attr('y', 0)
          .attr('fill', '#dddddd')
          .attr('width', colWidth)
          .attr('height', this.orderingScale.bandwidth())
          .attr('fill', (d: Node) => this.attributeScales[col](d[col]))
          .attr('cursor', 'pointer')
          .on('mouseover', (d: Node) => this.hoverNode(d.id))
          .on('mouseout', (d: Node) => this.unHoverNode(d.id))
          .on('click', (d: Node) => {
            this.selectElement(d);
            this.selectNeighborNodes(d.id, d.neighbors);
          });
      }
    });

    selectAll('.attrSortIcon').remove();

    // Add sort icons to the top of the header
    const path = this.columnHeaders
      .selectAll('path')
      .data(this.visualizedAttributes);

    path
      .enter()
      .append('path')
      .merge(path)
      .attr('class', `sortIcon attr attrSortIcon`)
      .attr('cursor', 'pointer')
      .attr('d', (d: string) => {
        const type = this.isQuantitative(d) ? 'quant' : 'categorical';
        return this.icons[type].d;
      })
      .attr(
        'transform',
        (d: string, i: number) =>
          `scale(0.1)translate(${
            (colWidth + this.colMargin) * i * 10 - 200
          }, -1100)`,
      )
      .style('fill', '#8B8B8B')
      .on('click', (d: string) => this.sort(d));
  }

  private isQuantitative(varName: string): boolean {
    const uniqueValues = [
      ...new Set(
        this.network.nodes.map((node: Node) => parseFloat(node[varName])),
      ),
    ];
    return uniqueValues.length > 5;
  }

  /**
   * Draws the nested edge bars
   * @param  cells d3 selection corresponding to the matrix cell groups
   * @return       none
   */
  private drawEdgeBars(cells: any): void {
    // bind squares to cells for the mouse over effect
    const dividers = this.isMultiEdge ? 2 : 1;

    // let squares = cells
    let offset = 0;
    let squareSize = this.orderingScale.bandwidth() - 2 * offset;

    for (let index = 0; index < dividers; index++) {
      const type = this.isMultiEdge
        ? this.attributeScales.edge.type.domain[index]
        : 'interacted';

      cells
        .append('rect')
        .classed(`nestedEdges nestedEdges${type}`, true)
        .attr('x', offset)
        .attr('y', offset)
        .attr('height', squareSize)
        .attr('width', squareSize)
        .attr('fill', (d: any) => this.edgeScales[type](d[type]));

      // adjust offset and square size for the next edge type
      offset = squareSize / 4;
      squareSize = squareSize - 2 * offset;
    }

    // remove all edge rectangles that have no interactions
    cells
      .selectAll('.nestedEdges')
      .filter((d: any) => {
        return d.mentions === 0 && d.retweet === 0 && d.interacted === 0;
      })
      .remove();
  }

  private hoverNode(nodeID: string): void {
    const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
    selectAll(cssSelector).classed('hovered', true);
  }

  private unHoverNode(nodeID: string): void {
    const cssSelector = `[id="attrRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
    selectAll(cssSelector).classed('hovered', false);
  }

  private selectElement(element: Cell | Node): void {
    let elementsToSelect: string[] = [];
    let newElement: { [key: string]: string[] };

    if (this.isCell(element)) {
      // Remove or add cell from selected cells
      if (element.cellName in this.selectedElements) {
        delete this.selectedElements[element.cellName];
      } else {
        // Get all the elements to be selected
        elementsToSelect = [
          `[id="attrRow${element.colID}"]`,
          `[id="topoRow${element.colID}"]`,
          `[id="topoCol${element.colID}"]`,
          `[id="colLabel${element.colID}"]`,
          `[id="rowLabel${element.colID}"]`,

          `[id="attrRow${element.rowID}"]`,
          `[id="topoRow${element.rowID}"]`,
          `[id="topoCol${element.rowID}"]`,
          `[id="colLabel${element.rowID}"]`,
          `[id="rowLabel${element.rowID}"]`,

          `[id="${element.cellName}"]`,
        ];
        newElement = { [element.cellName]: elementsToSelect };
        this.selectedElements = Object.assign(
          this.selectedElements,
          newElement,
        );
      }
    } else {
      if (element.id in this.selectedElements) {
        delete this.selectedElements[element.id];
      } else {
        elementsToSelect = [
          `[id="attrRow${element.id}"]`,
          `[id="topoRow${element.id}"]`,
          `[id="topoCol${element.id}"]`,
          `[id="colLabel${element.id}"]`,
          `[id="rowLabel${element.id}"]`,
        ];
        newElement = { [element.id]: elementsToSelect };
        this.selectedElements = Object.assign(
          this.selectedElements,
          newElement,
        );
      }
    }

    // Reset all nodes to not neighbor highlighted
    selectAll('.clicked').classed('clicked', false);

    // Loop through the neighbor nodes to be highlighted and highlight them
    const selections: string[] = [];
    for (const elementID of Object.keys(this.selectedElements)) {
      for (const elementToSelect of this.selectedElements[elementID]) {
        selections.push(elementToSelect);
      }
    }

    if (selections.length > 0) {
      selectAll(selections.join(',')).classed('clicked', true);
    }
  }

  private selectNeighborNodes(nodeID: string, neighbors: string[]): void {
    // Remove or add node from column selected nodes
    if (nodeID in this.selectedNodesAndNeighbors) {
      delete this.selectedNodesAndNeighbors[nodeID];
    } else {
      const newElement = { [nodeID]: neighbors };
      this.selectedNodesAndNeighbors = Object.assign(
        this.selectedNodesAndNeighbors,
        newElement,
      );
    }

    // Reset all nodes to not neighbor highlighted
    selectAll('.neighbor').classed('neighbor', false);

    // Loop through the neighbor nodes to be highlighted and highlight them
    const selections: string[] = [];
    for (const node of Object.keys(this.selectedNodesAndNeighbors)) {
      for (const neighborNode of this.selectedNodesAndNeighbors[node]) {
        selections.push(`[id="attrRow${neighborNode}"]`);
        selections.push(`[id="topoRow${neighborNode}"]`);
        selections.push(`[id="nodeLabelRow${neighborNode}"]`);
      }
    }

    if (selections.length > 0) {
      selectAll(selections.join(',')).classed('neighbor', true);
    }
  }

  /**
   * [sort description]
   * @return [description]
   */
  private sort(order: string): void {
    const nodeIDs = this.network.nodes.map((node: Node) => node.id);

    this.order = this.changeOrder(order, nodeIDs.includes(order));
    this.orderingScale.domain(this.order);

    const transitionTime = 500;

    (selectAll('.rowContainer') as any)
      .transition()
      .duration(transitionTime)
      .attr(
        'transform',
        (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`,
      );

    (selectAll('.attrRowContainer') as any)
      .transition()
      .duration(transitionTime)
      .attr(
        'transform',
        (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`,
      );

    // if any other method other than neighbors sort, sort the columns too
    if (!nodeIDs.includes(order)) {
      this.edges
        .selectAll('.column')
        .transition()
        .duration(transitionTime)
        .attr(
          'transform',
          (d: any, i: number) =>
            `translate(${this.orderingScale(i)},0)rotate(-90)`,
        );

      (selectAll('.rowContainer') as any)
        .selectAll('.cell')
        .transition()
        .duration(transitionTime)
        .attr('x', (d: Node, i: number) => this.orderingScale(i));
    }

    selectAll('.sortIcon')
      .style('fill', '#8B8B8B')
      .filter((d: any) => d.id === order)
      .style('fill', '#EBB769');
  }

  private sortObserver(type: string, isNode = false): number[] {
    let order;
    this.sortKey = type;
    if (
      type === 'clusterSpectral' ||
      type === 'clusterBary' ||
      type === 'clusterLeaf'
    ) {
      const links: any[] = Array(this.network.links.length);

      this.network.links.forEach((link: Link, index: number) => {
        links[index] = {
          source: this.network.nodes.find(
            (node: Node) => node.id === link.source,
          ),
          target: this.network.nodes.find(
            (node: Node) => node.id === link.target,
          ),
        };
      });

      const sortableNetwork = reorder
        .graph()
        .nodes(this.network.nodes)
        .links(links)
        .init();

      if (type === 'clusterBary') {
        const barycenter = reorder.barycenter_order(sortableNetwork);
        order = reorder.adjacent_exchange(
          sortableNetwork,
          barycenter[0],
          barycenter[1],
        )[1];
      } else if (type === 'clusterSpectral') {
        order = reorder.spectral_order(sortableNetwork);
      } else if (type === 'clusterLeaf') {
        const mat = reorder.graph2mat(sortableNetwork);
        order = reorder.optimal_leaf_order()(mat);
      }
    } else if (this.sortKey === 'edges') {
      order = range(this.network.nodes.length).sort(
        (a, b) => this.network.nodes[b][type] - this.network.nodes[a][type],
      );
    } else if (isNode === true) {
      order = range(this.network.nodes.length).sort((a, b) =>
        this.network.nodes[a].id.localeCompare(this.network.nodes[b].id),
      );
      order = range(this.network.nodes.length).sort(
        (a, b) =>
          Number(this.network.nodes[b].neighbors.includes(type)) -
          Number(this.network.nodes[a].neighbors.includes(type)),
      );
    } else if (this.sortKey === 'shortName') {
      order = range(this.network.nodes.length).sort((a, b) =>
        this.network.nodes[a].id.localeCompare(this.network.nodes[b].id),
      );
    } else {
      order = range(this.network.nodes.length).sort(
        (a, b) => this.network.nodes[b][type] - this.network.nodes[a][type],
      );
    }
    this.order = order;
    return order;
  }

  /**
   * returns an object containing the current provenance state.
   * @return [the provenance state]
   */
  private getApplicationState(): State {
    return this.provenance.graph().current.state;
  }

  private changeOrder(type: string, node: boolean): number[] {
    const action = this.generateSortAction(type);
    this.provenance.applyAction(action);
    return this.sortObserver(type, node);
  }

  private generateSortAction(
    sortKey: string,
  ): { label: string; action: (key: string) => State; args: any[] } {
    return {
      label: 'sort',
      action: (key: string) => {
        const currentState = this.getApplicationState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = 'sort';

        currentState.sortKey = key;
        if (this.mouseOverEvents !== undefined) {
          this.mouseOverEvents.length = 0;
        }

        return currentState;
      },
      args: [sortKey],
    };
  }

  private isCell(element: any): element is Cell {
    return Object.prototype.hasOwnProperty.call(element, 'cellName');
  }
}
