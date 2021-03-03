<script lang="ts">
import Vue, { PropType } from 'vue';

import {
  superGraph,
  processChildNodes,
  processChildLinks,
  expandSuperNetwork,
  retractSuperNetwork,
} from '@/lib/aggregation';
import { Cell, Dimensions, Link, Network, Node, State } from '@/types';
import {
  axisTop,
  max,
  min,
  range,
  ScaleBand,
  scaleBand,
  ScaleLinear,
  scaleLinear,
  scaleOrdinal,
  schemeCategory10,
  select,
  selectAll,
} from 'd3';
import * as ProvenanceLibrary from 'provenance-lib-core/lib/src/provenance-core/Provenance';

import 'science';
import 'reorder.js';

declare const reorder: any;

export default Vue.extend({
  props: {
    network: {
      type: Object as PropType<Network>,
      required: true,
    },
    selectNeighbors: {
      type: Boolean,
      default: true,
    },
    enableGraffinity: {
      type: Boolean,
      required: true,
    },
    showAggrLegend: {
      type: Boolean,
      required: true,
    },
    showChildLegend: {
      type: Boolean,
      required: true,
    },
    visualizedAttributes: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    directional: {
      type: Boolean,
      default: false,
    },
  },

  data(): {
    browser: Dimensions;
    visMargins: any;
    matrixSVG: any;
    attributesSVG: any;
    cellSize: number;
    maxNumConnections: number;
    maxAggrConnections: number;
    maxChildConnections: number;
    matrix: Cell[][];
    attributes: any;
    attributeRows: any;
    attributeZebras: any;
    columnHeaders: any;
    edges: any;
    edgeColumns: any;
    edgeRows: any;
    cells: any;
    clickMap: Map<string, boolean>; // variable for keeping track of whether a label has been clicked or not
    nonAggrNodes: Node[];
    nonAggrLinks: Link[];
    expandRetractAggrVisNodes: Network; // variable for keeping track of the current nodes being visualized
    expandRetractAggrVisLinks: Network; // variable for keeping track of the current links being visualized
    icons: { [key: string]: { [d: string]: string } };
    selectedNodesAndNeighbors: { [key: string]: string[] };
    selectedElements: { [key: string]: string[] };
    order: any;
    orderType: any;
    provenance: any;
    sortKey: string;
    colMargin: number;
    showIcon: boolean;
  } {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      visMargins: { left: 75, top: 75, right: 0, bottom: 0 },
      matrixSVG: undefined,
      attributesSVG: undefined,
      cellSize: 15,
      maxNumConnections: -Infinity,
      maxAggrConnections: -Infinity,
      maxChildConnections: -Infinity,
      matrix: [],
      attributes: undefined,
      attributeRows: undefined,
      attributeZebras: undefined,
      columnHeaders: undefined,
      edges: undefined,
      edgeColumns: undefined,
      edgeRows: undefined,
      cells: undefined,
      clickMap: new Map<string, boolean>(),
      nonAggrNodes: [],
      nonAggrLinks: [],
      expandRetractAggrVisNodes: {
        nodes: [],
        links: [],
      },
      expandRetractAggrVisLinks: {
        nodes: [],
        links: [],
      },
      icons: {
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
      },
      selectedNodesAndNeighbors: {},
      selectedElements: {},
      order: undefined,
      orderType: undefined,
      provenance: undefined,
      sortKey: '',
      colMargin: 5,
      showIcon: false,
    };
  },

  computed: {
    properties(this: any) {
      const {
        network,
        visualizedAttributes,
        enableGraffinity,
        showAggrLegend,
        showChildLegend,
      } = this;
      return {
        network,
        visualizedAttributes,
        enableGraffinity,
        showAggrLegend,
        showChildLegend,
      };
    },

    matrixNodeLength(): number {
      return this.network.nodes.length;
    },

    matrixWidth(): number {
      return (
        this.matrixNodeLength * this.cellSize +
        this.visMargins.left +
        this.visMargins.right
      );
    },

    matrixHeight(): number {
      return (
        this.matrixNodeLength * this.cellSize +
        this.visMargins.top +
        this.visMargins.bottom
      );
    },

    attributesWidth(): number {
      return 300;
    },

    attributesHeight(): number {
      return this.matrixHeight;
    },

    orderingScale(): ScaleBand<number> {
      return scaleBand<number>()
        .domain(range(0, this.matrix.length, 1))
        .range([0, this.matrixHighlightLength]);
    },

    matrixHighlightLength(): number {
      return this.matrix.length * this.cellSize;
    },

    idMap() {
      const computedIdMap: { [key: string]: number } = {};
      this.network.nodes.forEach((node: Node, index: number) => {
        computedIdMap[node.id] = index;
      });

      return computedIdMap;
    },

    attributeScales() {
      const scales: { [key: string]: any } = {};

      // Calculate the attribute scales
      this.visualizedAttributes.forEach((col: string) => {
        if (this.isQuantitative(col)) {
          const minimum =
            min(this.network.nodes.map((node: Node) => node[col])) || '0';
          const maximum =
            max(this.network.nodes.map((node: Node) => node[col])) || '0';
          const domain = [parseFloat(minimum), parseFloat(maximum)];

          const scale = scaleLinear().domain(domain).range([0, this.colWidth]);
          scale.clamp(true);
          scales[col] = scale;
        } else {
          const values: string[] = this.network.nodes.map((node: Node) => {
            if (node.type === 'supernode') {
              return node['GROUP'];
            } else {
              return node[col];
            }
          });
          const domain = [...new Set(values)];
          const scale = scaleOrdinal(schemeCategory10).domain(domain);

          scales[col] = scale;
        }
      });

      return scales;
    },

    colWidth(): number {
      const attrWidth = parseFloat(select('#attributes').attr('width'));
      return attrWidth / this.visualizedAttributes.length - this.colMargin;
    },

    colorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxNumConnections])
        .range(['#feebe2', '#690000']); // TODO: colors here are arbitrary, change later
    },

    aggrColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxAggrConnections])
        .range(['#dcedfa', '#0066cc']);
    },

    childColorScale(): ScaleLinear<string, number> {
      return scaleLinear<string, number>()
        .domain([0, this.maxChildConnections])
        .range(['#f79d97', '#c0362c']);
    },
  },

  watch: {
    visualizedAttributes() {
      this.renderAttributes();
    },

    network() {
      this.processData();
      this.changeMatrix();
    },

    directional() {
      this.processData();
      this.changeMatrix();
    },

    colorScale() {
      this.$emit('updateMatrixLegendScale', this.colorScale);
    },
    aggrColorScale() {
      this.$emit(
        'updateAggrMatrixLegendScale',
        this.aggrColorScale,
        'aggregate',
      );
    },
    childColorScale() {
      this.$emit('updateChildMatrixLegendScale', this.childColorScale, 'child');
    },
  },

  async mounted(this: any) {
    this.browser.width =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;

    this.browser.height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    // Run process data to convert links to cells
    this.processData();

    this.edges = select('#matrix')
      .append('g')
      .attr(
        'transform',
        `translate(${this.visMargins.left},${this.visMargins.top})`,
      );

    this.attributes = select('#attributes')
      .append('g')
      .attr('transform', `translate(0,${this.visMargins.top})`);

    this.attributes.append('g').attr('class', 'zebras');

    // Draw buttons for alternative sorts
    let initialY = -this.visMargins.left + 10;
    const buttonHeight = 15;
    const text = ['name', 'cluster', 'interacts'];
    const sortNames = ['shortName', 'clusterLeaf', 'edges'];
    const iconNames = ['alphabetical', 'categorical', 'quant'];
    for (let i = 0; i < 3; i++) {
      const button = this.edges
        .append('g')
        .attr('transform', `translate(${-this.visMargins.left},${initialY})`);
      button.attr('cursor', 'pointer');
      button
        .append('rect')
        .attr('width', this.visMargins.left - 5)
        .attr('height', buttonHeight)
        .attr('fill', 'none')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1);
      button
        .append('text')
        .attr('x', 27)
        .attr('y', 10)
        .attr('font-size', 11)
        .text(text[i]);
      const path = button.datum(sortNames[i]);
      path
        .append('path')
        .attr('class', 'sortIcon')
        .attr('d', (d: any, i: number) => {
          return this.icons[iconNames[i]].d;
        })
        .style('fill', () =>
          sortNames[i] === this.orderType ? '#EBB769' : '#8B8B8B',
        )
        .attr('transform', 'scale(0.1)translate(-195,-320)')
        .attr('cursor', 'pointer');
      button.on('click', () => this.sort(sortNames[i]));
      initialY += buttonHeight + 5;
    }

    this.provenance = this.setUpProvenance();

    this.renderAttributes();
    this.initializeEdges();
  },

  methods: {
    changeMatrix(this: any) {
      this.renderAttributes();
      this.initializeEdges();
    },

    processData(): void {
      // Reset some values that will be re-calcuated
      this.maxNumConnections = 0;
      this.maxAggrConnections = 0;
      this.maxChildConnections = 0;
      this.matrix = [];

      this.network.nodes.forEach((rowNode: Node, i: number) => {
        this.matrix[i] = this.network.nodes.map((colNode: Node, j: number) => {
          return {
            cellName: `${rowNode.id}_${colNode.id}`,
            rowCellType: rowNode.type,
            colCellType: colNode.type,
            correspondingCell: `${colNode.id}_${rowNode.id}`,
            rowID: rowNode.id,
            colID: colNode.id,
            x: j,
            y: i,
            z: 0,
          };
        });
      });

      // Count occurrences of links and store it in the matrix
      this.network.links.forEach((link: Link) => {
        this.matrix[this.idMap[link._from]][this.idMap[link._to]].z += 1;

        if (!this.directional) {
          this.matrix[this.idMap[link._to]][this.idMap[link._from]].z += 1;
        }
      });

      // Find max value of z
      this.matrix.forEach((row: Cell[]) => {
        row.forEach((cell: Cell) => {
          if (
            cell.rowCellType === undefined ||
            cell.colCellType === undefined
          ) {
            if (cell.z > this.maxNumConnections) {
              this.maxNumConnections = cell.z;
            }
          }
          if (
            cell.rowCellType === 'supernode' &&
            cell.colCellType === 'supernode'
          ) {
            if (cell.z > this.maxAggrConnections) {
              this.maxAggrConnections = cell.z;
            }
          }
          if (
            cell.rowCellType === 'childnode' ||
            cell.colCellType === 'childnode'
          ) {
            if (cell.z > this.maxChildConnections) {
              this.maxChildConnections = cell.z;
            }
          }
        });
      });
    },

    setUpProvenance(): any {
      const initialState = {
        workerID: 1, // workerID is a global variable
        nodes: '', // array of nodes that keep track of their position, whether they were softSelect or hardSelected;
        search: '', // field to store the id of a searched node;
        startTime: Date.now(), // time this provenance graph was created and the task initialized;
        endTime: '', // time the submit button was pressed and the task ended;
        time: Date.now(), // timestamp for the current state of the graph;
        count: 0,
        clicked: [],
        sortKey: this.sortKey,
        selections: {
          attrRow: {},
          rowLabel: {},
          colLabel: {},
          neighborSelect: {},
          cellCol: {},
          cellRow: {},
          search: {},
        },
      };

      const provenance = ProvenanceLibrary.initProvenance(initialState);
      this.provenance = provenance;

      return provenance;
    },

    initializeEdges(): void {
      // set the radius for cells
      const cellRadius = 3;

      // set the matrix highlight
      const matrixHighlightLength = this.matrix.length * this.cellSize;

      // constant for starting the column label container
      const columnLabelContainerStart = 20;
      const labelContainerHeight = 25;
      const rowLabelContainerStart = 75;
      const labelContainerWidth = rowLabelContainerStart;

      const verticalOffset = 187.5;
      const horizontalOffset =
        (this.orderingScale.bandwidth() / 2 - 4.5) / 0.075;

      // creates column groupings
      this.edgeColumns = this.edges
        .selectAll('.column')
        .data(this.network.nodes, (d: Node) => d._id || d.id)
        .attr('transform', (d: Node, i: number) => {
          return `translate(${this.orderingScale(i)})rotate(-90)`;
        });

      this.edgeColumns.exit().remove();

      const columnEnter = this.edgeColumns
        .enter()
        .append('g')
        .attr('class', 'column')
        .attr('transform', (d: Node) => {
          if (d.type === 'childnode') {
            return `translate(${this.orderingScale(
              d.parentPosition,
            )})rotate(-90)`;
          } else {
            return `translate(0, 0)rotate(-90)`;
          }
        });

      columnEnter
        .transition()
        .duration(1000)
        .attr('transform', (d: Node, i: number) => {
          return `translate(${this.orderingScale(i)})rotate(-90)`;
        });

      // add the highlight columns
      columnEnter
        .append('rect')
        .classed('topoCol', true)
        .attr('id', (d: Node) => `topoCol${d.id}`)
        .attr('x', -matrixHighlightLength - this.visMargins.bottom)
        .attr('y', 0)
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.top + this.visMargins.bottom,
        )
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill-opacity', 0);

      columnEnter
        .append('foreignObject')
        .attr('y', -5)
        .attr('x', columnLabelContainerStart)
        .attr('width', labelContainerWidth)
        .attr('height', labelContainerHeight)
        .append('xhtml:p')
        .text((d: Node) => d._key)
        .style('color', (d: Node) => {
          if (d.type === 'node') {
            return '#aaa';
          } else {
            return 'black';
          }
        })
        .classed('colLabels', true)
        .on('click', (d: Node) => {
          this.selectElement(d);
          this.selectNeighborNodes(d.id, d.neighbors);
        })
        .on('mouseover', (d: Node, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverNode(d.id);
        })
        .on('mouseout', (d: Node) => {
          this.hideToolTip();
          this.unHoverNode(d.id);
        });

      columnEnter.selectAll('p').style('color', (d: Node) => {
        if (d.type === 'childnode') {
          return '#aaa';
        } else {
          return 'black';
        }
      });

      columnEnter
        .append('path')
        .attr('id', (d: Node) => `sortIcon${d.id}`)
        .attr('class', 'sortIcon')
        .attr('d', this.icons.cellSort.d)
        .style('fill', (d: Node) =>
          d === this.orderType ? '#EBB769' : '#8B8B8B',
        )
        .attr(
          'transform',
          `scale(0.075)translate(${verticalOffset},${horizontalOffset})rotate(90)`,
        )
        .on('click', (d: Node) => {
          this.sort(d.id);
          const action = this.changeInteractionWrapper('neighborSelect');
          this.provenance.applyAction(action);
        })
        .attr('cursor', 'pointer')
        .on('mouseover', (d: Node, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverNode(d.id);
        })
        .on('mouseout', (d: Node) => {
          this.hideToolTip();
          this.unHoverNode(d.id);
        });

      this.edgeColumns.merge(columnEnter);

      // Draw each row
      this.edgeRows = this.edges
        .selectAll('.rowContainer')
        .data(this.network.nodes, (d: Node) => d._id || d.id)
        .attr('transform', (d: Node, i: number) => {
          return `translate(0,${this.orderingScale(i)})`;
        });

      this.edgeRows.exit().remove();

      const rowEnter = this.edgeRows
        .enter()
        .append('g')
        .attr('class', 'rowContainer')
        .attr('transform', (d: Node) => {
          if (d.type === 'childnode') {
            return `translate(0, ${this.orderingScale(d.parentPosition)})`;
          } else {
            return `translate(0, 0)`;
          }
        });

      rowEnter
        .transition()
        .duration(1000)
        .attr('transform', (d: Node, i: number) => {
          return `translate(0,${this.orderingScale(i)})`;
        });

      rowEnter
        .append('rect')
        .classed('topoRow', true)
        .attr('id', (d: Node) => `topoRow${d.id}`)
        .attr('x', -this.visMargins.left)
        .attr('y', 0)
        .attr(
          'width',
          matrixHighlightLength + this.visMargins.left + this.visMargins.right,
        )
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill-opacity', 0);

      // add foreign objects for label
      rowEnter
        .append('foreignObject')
        .attr('x', (d: Node) => {
          if (d.type === 'childnode') {
            return -rowLabelContainerStart + 15;
          } else {
            return -rowLabelContainerStart;
          }
        })
        .attr('y', -5)
        .attr('width', labelContainerWidth - 15)
        .attr('height', labelContainerHeight)
        .append('xhtml:p')
        .text((d: Node) => d._key)
        .style('color', (d: Node) => {
          if (d.type === 'node') {
            return '#aaa';
          } else {
            return 'black';
          }
        })
        .classed('rowLabels', true);

      rowEnter.selectAll('p').style('color', (d: Node) => {
        if (d.type === 'childnode') {
          return '#aaa';
        } else {
          return 'black';
        }
      });

      rowEnter.on('mouseout', (d: Node) => {
        this.hideToolTip();
        this.unHoverNode(d.id);
      });

      if (this.showIcon === true) {
        const expandPath =
          'M17,13H13V17H11V13H7V11H11V7H13V11H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z';
        // const retractPath =
        //   'M17,13H7V11H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z';
        rowEnter
          .append('path')
          .attr('id', (d: Node) => d.id)
          .attr('d', (d: Node) => {
            if (d.type === 'supernode') {
              return expandPath;
            } else {
              return '';
            }
          })
          // .attr('d', "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z")
          .attr('transform', 'scale(0.6)translate(-50, 2)');
      }

      rowEnter.on('click', (d: Node) => {
        // allow expanding the vis if graffinity features are turned on
        if (this.enableGraffinity) {
          if (d.type === 'childnode') {
            return;
          }
          const supernode = d;
          // expand and retract the supernode aggregation based on user selection
          if (this.clickMap.get(supernode.id)) {
            this.$emit(
              'updateNetwork',
              retractSuperNetwork(
                this.nonAggrNodes,
                this.nonAggrLinks,
                this.network.nodes,
                this.network.links,
                supernode,
              ),
            );
            this.clickMap.set(supernode.id, false);

            // Hide Child Legend
            const values = [...this.clickMap.values()];
            if (!values.includes(true)) {
              this.$emit('updateMatrixLegends', true, false);
            }
          } else {
            this.$emit(
              'updateNetwork',
              expandSuperNetwork(
                this.nonAggrNodes,
                this.nonAggrLinks,
                this.network.nodes,
                this.network.links,
                supernode,
              ),
            );
            this.clickMap.set(supernode.id, true);

            // Display Child Legend
            this.$emit('updateMatrixLegends', true, true);
          }
        } else {
          this.selectElement(d);
          this.selectNeighborNodes(d.id, d.neighbors);
        }
      });

      rowEnter.append('g').attr('class', 'cellsGroup');

      this.edgeRows.merge(rowEnter);

      this.drawGridLines();

      // Draw cells
      this.cells = selectAll('.cellsGroup')
        .selectAll('.cell')
        .data((d: unknown, i: number) => this.matrix[i]);

      // Update existing cells
      this.cells
        .attr('id', (d: Cell) => d.cellName)
        .attr('x', (d: Cell) => {
          const xLocation = this.orderingScale(d.x);
          return xLocation !== undefined ? xLocation + 1 : null;
        })
        .attr('y', 1)
        .attr('width', this.cellSize - 2)
        .attr('height', this.cellSize - 2)
        .attr('rx', cellRadius)
        .style('fill', (d: Cell) => {
          if (d.rowCellType === undefined) {
            return this.colorScale(d.z);
          }
          if (d.rowCellType === 'supernode' && d.colCellType === 'supernode') {
            return this.aggrColorScale(d.z);
          }
          if (d.rowCellType === 'childnode' || d.colCellType === 'childnode') {
            return this.childColorScale(d.z);
          }
        })
        .style('fill-opacity', (d: Cell) => d.z)
        .on('mouseover', (d: Cell, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverEdge(d);
        })
        .on('mouseout', (d: Cell) => {
          this.hideToolTip();
          this.unHoverEdge(d);
        })
        .on('click', (d: Cell) => this.selectElement(d))
        .attr('cursor', 'pointer');

      this.cells.exit().remove();

      // Render new cells
      const cellsEnter = this.cells
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('id', (d: Cell) => d.cellName)
        .attr('x', (d: Cell) => {
          const xLocation = this.orderingScale(d.x);
          return xLocation !== undefined ? xLocation + 1 : null;
        })
        .attr('y', 1)
        .attr('width', this.cellSize - 2)
        .attr('height', this.cellSize - 2)
        .attr('rx', cellRadius)
        .style('fill', (d: Cell) => {
          if (d.rowCellType === undefined) {
            return this.colorScale(d.z);
          }
          if (d.rowCellType === 'supernode' && d.colCellType === 'supernode') {
            return this.aggrColorScale(d.z);
          }
          if (d.rowCellType === 'childnode' || d.colCellType === 'childnode') {
            return this.childColorScale(d.z);
          }
        })

        .style('fill-opacity', (d: Cell) => d.z)
        .on('mouseover', (d: Cell, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverEdge(d);
        })
        .on('mouseout', (d: Cell) => {
          this.hideToolTip();
          this.unHoverEdge(d);
        })
        .on('click', (d: Cell) => this.selectElement(d))
        .attr('cursor', 'pointer');

      this.cells.merge(cellsEnter);
    },

    changeInteractionWrapper(interactionType: string, cell?: Cell): any {
      return {
        label: interactionType,
        action: (interactID: string) => {
          const currentState = this.getApplicationState();
          // add time stamp to the state graph
          currentState.time = Date.now();
          currentState.event = interactionType;
          const interactionName = interactionType; // cell, search, etc
          let interactedElement = interactionType;
          if (interactionName === 'cell' && cell !== undefined) {
            interactID = cell.colID;
            interactedElement = cell.cellName; // + cellData.rowID;

            this.changeInteraction(
              currentState,
              interactID,
              'cellCol',
              interactedElement,
            );
            this.changeInteraction(
              currentState,
              interactID,
              'cellRow',
              interactedElement,
            );
            if (cell.cellName !== cell.correspondingCell) {
              interactedElement = cell.correspondingCell; // + cellData.rowID;
              interactID = cell.rowID;

              this.changeInteraction(
                currentState,
                interactID,
                'cellCol',
                interactedElement,
              );
              this.changeInteraction(
                currentState,
                interactID,
                'cellRow',
                interactedElement,
              );
            }
            return currentState;

            // interactID = cellData.rowID;
            // interactionName = interactionName + 'row'
          } else if (interactionName === 'highlightRow') {
            return interactionName;
          } else if (interactionName === 'neighborSelect') {
            this.changeInteraction(
              currentState,
              interactID,
              interactionName,
              interactedElement,
            );
            return currentState;
          }
        },
      };
    },

    changeInteraction(
      state: State,
      nodeID: string,
      interaction: keyof State['selections'],
      interactionName: string = interaction,
    ): void {
      if (nodeID in state.selections[interaction]) {
        // Remove element if in list, if list is empty, delete key
        const currentIndex = state.selections[interaction][nodeID].indexOf(
          interactionName,
        );
        if (currentIndex > -1) {
          state.selections[interaction][nodeID].splice(currentIndex, 1);
          if (state.selections[interaction][nodeID].length === 0) {
            delete state.selections[interaction][nodeID];
          }
        } else {
          state.selections[interaction][nodeID].push(interactionName);
        }
      } else {
        state.selections[interaction][nodeID] = [interactionName];
      }
    },

    drawGridLines(): void {
      selectAll('.gridLines').remove();
      const gridLines = this.edges.append('g').attr('class', 'gridLines');

      const lines = gridLines.selectAll('line').data(this.matrix).enter();

      // vertical grid lines
      lines
        .append('line')
        .attr('transform', (d: any, i: number) => {
          return `translate(${this.orderingScale(i)},0)rotate(-90)`;
        })
        .attr('x1', -this.orderingScale.range()[1]);

      // horizontal grid lines
      lines
        .append('line')
        .attr('transform', (d: any, i: number) => {
          return `translate(0,${this.orderingScale(i)})`;
        })
        .attr('x2', this.orderingScale.range()[1]);

      // vertical grid line edges
      gridLines
        .append('line')
        .attr('x1', this.orderingScale.range()[1])
        .attr('x2', this.orderingScale.range()[1])
        .attr('y1', 0)
        .attr('y2', this.orderingScale.range()[1])
        .style('stroke', '#aaa')
        .style('opacity', 0.3);

      // horizontal grid line edges
      gridLines
        .append('line')
        .attr('x1', 0)
        .attr('x2', this.orderingScale.range()[1])
        .attr('y1', this.orderingScale.range()[1])
        .attr('y2', this.orderingScale.range()[1])
        .style('stroke', '#aaa')
        .style('opacity', 0.3);
    },

    sort(order: string): void {
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
    },

    renderAttributes(): void {
      // Just has to be larger than the attributes panel (so that we render to the edge)
      const attributeWidth = 1000;

      // Add/Update zebras
      this.attributeZebras = (select('.zebras') as any)
        .selectAll('.attrRowBackground')
        .data(this.network.nodes, (d: Node) => d._id || d.id);

      this.attributeZebras.exit().remove();

      const attributeZebrasEnter = this.attributeZebras
        .enter()
        .append('g')
        .attr('class', 'attrRowBackground');

      attributeZebrasEnter
        .append('rect')
        .classed('zebra', true)
        .attr('y', (d: Node, i: number) => this.orderingScale(i))
        .attr('width', attributeWidth)
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill', (d: Node, i: number) => (i % 2 === 0 ? '#fff' : '#eee'));

      // Highlightable backgrounds for the vis
      attributeZebrasEnter
        .append('rect')
        .classed('highlightRow', true)
        .attr('y', (d: Node, i: number) => this.orderingScale(i))
        .attr('id', (d: Node) => `highlightRow${d.id}`)
        .attr('width', attributeWidth)
        .attr('height', this.orderingScale.bandwidth())
        .attr('fill-opacity', 0)
        .attr('cursor', 'pointer')
        .on('mouseover', (d: Node, i: number, nodes: any) => {
          this.showToolTip(d, i, nodes);
          this.hoverNode(d.id);
        })
        .on('mouseout', (d: Node) => {
          this.hideToolTip();
          this.unHoverNode(d.id);
        })
        .on('click', (d: Node) => {
          this.selectElement(d);
          this.selectNeighborNodes(d.id, d.neighbors);
        });

      this.attributeZebras.merge(attributeZebrasEnter);

      // Create a group for each column and add header info
      this.attributeRows = this.attributes
        .selectAll('.attrColumn')
        .data(this.visualizedAttributes, (d: string) => d);

      this.attributeRows.exit().remove();

      // Update locations of existing elements
      this.attributeRows.attr(
        'transform',
        (d: string, i: number) =>
          `translate(${(this.colWidth + this.colMargin) * i}, 0)`,
      );

      const attributeRowsEnter = this.attributeRows
        .enter()
        .append('g')
        .attr('class', 'attrColumn')
        .attr(
          'transform',
          (d: string, i: number) =>
            `translate(${(this.colWidth + this.colMargin) * i}, 0)`,
        );

      attributeRowsEnter
        .append('text')
        .style('font-size', '14px')
        .style('text-transform', 'capitalize')
        .style('word-wrap', 'break-word')
        .attr('text-anchor', 'left')
        .attr('transform', 'translate(0,-65)')
        .attr('cursor', 'pointer')
        .attr('y', 16)
        .text((d: string) => d)
        .attr('width', this.colWidth)
        .on('click', (d: string) => {
          if (this.enableGraffinity) {
            this.nonAggrNodes = processChildNodes(this.network.nodes);
            this.nonAggrLinks = processChildLinks(this.network.links);
            this.showIcon = true;
            this.$emit(
              'updateNetwork',
              superGraph(this.network.nodes, this.network.links, d),
            );

            // View/Hide Matrix Legends
            this.$emit('updateMatrixLegends', true, false);
          } else {
            this.sort(d);
          }
        });

      attributeRowsEnter
        .append('path')
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
              (this.colWidth + this.colMargin) * i * 10 - 200
            }, -1100)`,
        )
        .style('fill', '#8B8B8B')
        .on('click', (d: string) => this.sort(d));

      selectAll('.attr-axis').remove();

      // Add the scale bar at the top of the attr column
      this.visualizedAttributes.forEach((col: string, index: number) => {
        if (this.isQuantitative(col)) {
          this.attributes
            .append('g')
            .attr('class', 'attr-axis')
            .attr(
              'transform',
              `translate(${(this.colWidth + this.colMargin) * index},-15)`,
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

      attributeRowsEnter
        .append('g')
        .attr('class', (d: string) => `attrRows ${d}`);

      this.attributeRows.merge(attributeRowsEnter);

      const attributeVis = (selectAll('.attrRows') as any)
        .selectAll('.attrRow')
        .data(this.network.nodes, (d: Node) => d._id || d.id);

      // Update existing vis elements to resize width
      attributeVis
        .selectAll('rect')
        .attr('width', (d: Node, i: number, htmlNodes: any) => {
          const varName = htmlNodes[i].parentElement.parentElement.classList[1];

          if (this.isQuantitative(varName)) {
            return this.attributeScales[varName](d[varName]);
          } else {
            return this.colWidth;
          }
        });

      attributeVis.exit().remove();

      const attributeVisEnter = attributeVis
        .enter()
        .append('g')
        .attr('class', 'attrRow')
        .attr(
          'transform',
          (d: Node, i: number) => `translate(0,${this.orderingScale(i)})`,
        );

      // Draw new vis elements (bars/colors)
      attributeVisEnter
        .append('rect')
        .attr('height', this.orderingScale.bandwidth())
        .attr('width', (d: Node, i: number, htmlNodes: any) => {
          const varName = htmlNodes[i].parentElement.parentElement.classList[1];

          if (this.isQuantitative(varName)) {
            return this.attributeScales[varName](d[varName]);
          } else {
            return this.colWidth;
          }
        })
        .attr('fill', (d: Node, i: number, htmlNodes: any) => {
          const varName = htmlNodes[i].parentElement.parentElement.classList[1];

          if (this.isQuantitative(varName)) {
            return '#82b1ff';
          } else {
            if (d.type === 'supernode') {
              return this.attributeScales[varName](d['GROUP']);
            } else {
              return this.attributeScales[varName](d[varName]);
            }
          }
        })
        .attr('cursor', 'pointer')
        .on('mouseover', (d: Node) => this.hoverNode(d.id))
        .on('mouseout', (d: Node) => this.unHoverNode(d.id))
        .on('click', (d: Node) => {
          this.selectElement(d);
          this.selectNeighborNodes(d.id, d.neighbors);
        });
    },

    isQuantitative(varName: string): boolean {
      const uniqueValues = [
        ...new Set(
          this.network.nodes.map((node: Node) => parseFloat(node[varName])),
        ),
      ];
      return uniqueValues.length > 5;
    },

    selectElement(element: Cell | Node): void {
      let elementsToSelect: string[] = [];
      let newElement: { [key: string]: string[] };

      if (this.isCell(element)) {
        // Remove or add cell from selected cells
        if (element.cellName in this.selectedElements) {
          delete this.selectedElements[element.cellName];
        } else {
          // Get all the elements to be selected
          elementsToSelect = [
            `[id="highlightRow${element.colID}"]`,
            `[id="topoRow${element.colID}"]`,
            `[id="topoCol${element.colID}"]`,
            `[id="colLabel${element.colID}"]`,
            `[id="rowLabel${element.colID}"]`,

            `[id="highlightRow${element.rowID}"]`,
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
            `[id="highlightRow${element.id}"]`,
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
    },

    selectNeighborNodes(nodeID: string, neighbors: string[]): void {
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
          selections.push(`[id="highlightRow${neighborNode}"]`);
          selections.push(`[id="topoRow${neighborNode}"]`);
          selections.push(`[id="nodeLabelRow${neighborNode}"]`);
        }
      }

      if (selections.length > 0) {
        selectAll(selections.join(',')).classed('neighbor', true);
      }
    },

    showToolTip(d: Cell | Node, i: number, nodes: any): void {
      let node = nodes[i];

      // If foreign object, get the foreign object, not the p
      if (nodes[i].localName === 'p') {
        node = node.parentElement;
      }

      const matrix = node
        .getScreenCTM()
        .translate(nodes[i].getAttribute('x'), nodes[i].getAttribute('y'));

      let message = '';

      if (this.isCell(d)) {
        // Get link source and target
        message = `
      Row ID: ${d.rowID} <br/>
      Col ID: ${d.colID} <br/>
      Number of edges: ${d.z}`;
      } else {
        // Get node id
        message = `ID: ${d.id}`;

        // Loop through other props to add to tooltip
        for (const key of Object.keys(d)) {
          if (!['_key', '_rev', 'id', 'neighbors'].includes(key)) {
            message += `<br/> ${this.capitalizeFirstLetter(key)}: ${d[key]}`;
          }
        }
      }

      select(this.$refs.tooltip as any).html(message);

      select(this.$refs.tooltip as any)
        .style('left', `${window.pageXOffset + matrix.e}px`)
        .style(
          'top',
          `${
            window.pageYOffset +
            matrix.f -
            select(this.$refs.tooltip as any)
              .node()
              .getBoundingClientRect().height
          }px`,
        );

      select(this.$refs.tooltip as any)
        .transition()
        .delay(100)
        .duration(200)
        .style('opacity', 0.9);
    },

    hideToolTip(): void {
      select(this.$refs.tooltip as any)
        .transition()
        .delay(100)
        .duration(200)
        .style('opacity', 0);
    },

    changeOrder(type: string, node: boolean): number[] {
      const action = this.generateSortAction(type);
      this.provenance.applyAction(action);
      return this.sortObserver(type, node);
    },

    generateSortAction(
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

          return currentState;
        },
        args: [sortKey],
      };
    },

    sortObserver(type: string, isNode = false): number[] {
      let order;
      this.sortKey = type;
      if (
        type === 'clusterSpectral' ||
        type === 'clusterBary' ||
        type === 'clusterLeaf'
      ) {
        const links: any[] = Array(this.network.links.length);

        // Generate links that are compatible with reorder.js
        this.network.links.forEach((link: Link, index: number) => {
          links[index] = {
            source: this.network.nodes.find(
              (node: Node) => node.id === link._from,
            ),
            target: this.network.nodes.find(
              (node: Node) => node.id === link._to,
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
    },

    getApplicationState(): State {
      return this.provenance.graph().current.state;
    },

    isCell(element: any): element is Cell {
      return Object.prototype.hasOwnProperty.call(element, 'cellName');
    },

    capitalizeFirstLetter(word: string) {
      return word[0].toUpperCase() + word.slice(1);
    },

    hoverNode(nodeID: string): void {
      const cssSelector = `[id="highlightRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', true);
    },

    unHoverNode(nodeID: string): void {
      const cssSelector = `[id="highlightRow${nodeID}"],[id="topoRow${nodeID}"],[id="topoCol${nodeID}"]`;
      selectAll(cssSelector).classed('hovered', false);
    },

    hoverEdge(cell: Cell): void {
      this.hoverNode(cell.rowID);
      this.hoverNode(cell.colID);
    },

    unHoverEdge(cell: Cell): void {
      this.unHoverNode(cell.rowID);
      this.unHoverNode(cell.colID);
    },
  },
});
</script>

<template>
  <div>
    <svg
      id="matrix"
      ref="matrix"
      :width="this.matrixWidth"
      :height="this.matrixHeight"
      :viewbox="`0 0 ${this.matrixWidth} ${this.matrixHeight}`"
    />
    <svg
      id="attributes"
      ref="attributes"
      :width="this.attributesWidth"
      :height="this.attributesHeight"
      :viewbox="`0 0 ${this.attributesWidth} ${this.attributesHeight}`"
    />
    <div id="tooltip" ref="tooltip" />
  </div>
</template>

<style scoped>
svg >>> .baseCell {
  fill-opacity: 0;
}

svg >>> .rowLabels {
  max-width: 75px;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 12pt;
  z-index: 100;
}

svg >>> .colLabels {
  max-width: 55px;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 12pt;
  z-index: 100;
}

svg >>> .hoveredCell {
  stroke-width: 1px;
  stroke: darkgray;
}

svg >>> .neighbor {
  fill: #caffc7;
  fill-opacity: 1;
}

svg >>> .colLabel,
svg >>> .rowLabel {
  cursor: pointer;
  fill: black !important;
}

svg >>> .highlightedCell {
  fill: #fff4d3;
  fill-opacity: 1 !important;
}

svg >>> .highlightCol {
  pointer-events: auto;
}

#tooltip {
  position: absolute;
  opacity: 0;
  font-size: 12.5px;
  background: white;
  color: black;
  border-radius: 5px;
  padding: 5px;
  pointer-events: none;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  max-width: 400px;
}

svg >>> .hovered {
  fill: #fde8ca;
  fill-opacity: 1 !important;
}

svg >>> .clicked {
  font-weight: 800;
  fill: #f8cf91;
  fill-opacity: 1;
}

svg >>> .cell.clicked {
  stroke: red;
  stroke-width: 3;
}

svg >>> text.hovered {
  font-weight: 450;
}

svg >>> text.clicked {
  font-weight: 650;
  fill: black !important;
}

svg >>> line {
  pointer-events: none;
  stroke: #aaa;
  opacity: 0.3;
}
</style>
