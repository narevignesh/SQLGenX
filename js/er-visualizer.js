/**
 * SQLGenX Entity-Relationship (ER) Visualizer & Schema Explorer
 * Highly Interactive Canvas-Based Architecture:
 *  - Pan & Zoom (Mouse Wheel, Drag Background, Pinch on touch)
 *  - Node Dragging with Smooth Auto-Anchor Connectors
 *  - Animated Flow Particles / Marching Dashes along Foreign Key Relations
 *  - Double-Click to Live-Preview Table Sample Data
 *  - Interactive Toolbar: Zoom In/Out, Reset View, Auto-Rearrange, Search Filter
 *  - Tabular Schema Inspector with Column Details & Constraints
 *  - Whole Database Foreign Key Mappings & Cardinality Matrix
 */

export class ERVisualizer {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    this.tables = [];
    this.relationships = [];
    this.nodes = [];
    
    // Selection & Hover State
    this.selectedTable = null;
    this.hoveredTable = null;
    this.hoveredRel = null;
    this.searchFilter = '';
    
    // Drag & Pan State
    this.isDragging = false;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.hasMoved = false;
    
    // Pan & Zoom Viewport Transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.minScale = 0.35;
    this.maxScale = 2.5;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    
    // Double-click Detection
    this.lastClickTime = 0;
    this.lastClickedTable = null;
    
    // Animation Loop for Relationship Flow
    this.dashOffset = 0;
    this.animFrameId = null;

    if (this.canvas) {
      this.setupCanvasEvents();
      this.setupToolbarEvents();
      this.startAnimationLoop();
    }
  }

  /* -------------------------------------------------------------------
   * Animation Loop for Animated Relationship Flow
   * ------------------------------------------------------------------- */
  startAnimationLoop() {
    const animate = () => {
      this.dashOffset -= 0.6;
      if (this.dashOffset < -24) this.dashOffset = 0;
      this.draw();
      this.animFrameId = requestAnimationFrame(animate);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  stopAnimationLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /* -------------------------------------------------------------------
   * Event Handlers: Mouse, Touch, Pan, Zoom
   * ------------------------------------------------------------------- */
  setupCanvasEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    window.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    window.addEventListener('mouseup', () => this.handlePointerUp());

    // Mouse wheel zooming
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Touch events for mobile/tablet
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.handlePointerUp());

    // Parent container resize observer
    if (this.canvas.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        if (this.canvas.parentElement.getBoundingClientRect().width > 0) {
          this.resizeCanvas();
          this.draw();
        }
      });
      resizeObserver.observe(this.canvas.parentElement);
    }
  }

  setupToolbarEvents() {
    // Fit to Screen
    document.getElementById('btn-er-fit-view')?.addEventListener('click', () => {
      this.zoomToFit();
    });

    // Zoom In
    document.getElementById('btn-er-zoom-in')?.addEventListener('click', () => {
      this.zoomAtCenter(1.25);
    });

    // Zoom Out
    document.getElementById('btn-er-zoom-out')?.addEventListener('click', () => {
      this.zoomAtCenter(0.8);
    });

    // Reset View
    document.getElementById('btn-er-reset-zoom')?.addEventListener('click', () => {
      this.resetView();
    });

    // Auto-Rearrange Layout
    document.getElementById('btn-er-auto-layout')?.addEventListener('click', () => {
      this.autoRearrange();
    });

    // Fullscreen Toggle
    document.getElementById('btn-er-fullscreen')?.addEventListener('click', () => {
      const wrapper = document.getElementById('er-canvas-wrapper');
      if (wrapper) {
        if (!document.fullscreenElement) {
          wrapper.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    });

    // Listen to Fullscreen changes to auto-resize and fit
    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.zoomToFit();
      }, 120);
    });
    document.addEventListener('webkitfullscreenchange', () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.zoomToFit();
      }, 120);
    });

    // Search Table in ER Diagram
    document.getElementById('er-search-input')?.addEventListener('input', (e) => {
      this.searchFilter = e.target.value.toLowerCase().trim();
      if (this.searchFilter) {
        const match = this.nodes.find(n => n.table.toLowerCase().includes(this.searchFilter));
        if (match) {
          this.centerOnNode(match);
        }
      }
      this.draw();
    });
  }

  getPointerCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || 1);
    const scaleY = this.canvas.height / (rect.height || 1);

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const screenX = (clientX - rect.left) * scaleX;
    const screenY = (clientY - rect.top) * scaleY;

    // Convert screen coordinates to world coordinates (accounting for pan & zoom)
    const worldX = (screenX - this.panX) / this.scale;
    const worldY = (screenY - this.panY) / this.scale;

    return { screenX, screenY, worldX, worldY };
  }

  handlePointerDown(e) {
    const coords = this.getPointerCoords(e);
    const { screenX, screenY, worldX, worldY } = coords;
    this.hasMoved = false;

    // Check if clicked inside any node
    const clicked = this.nodes.find(n => 
      worldX >= n.x && worldX <= n.x + n.width && worldY >= n.y && worldY <= n.y + n.height
    );

    if (clicked) {
      const now = Date.now();
      // Double click detection: preview table data
      if (this.lastClickedTable === clicked.table && (now - this.lastClickTime) < 320) {
        if (window.app && window.app.previewTableData) {
          window.app.previewTableData(clicked.table);
        }
        this.lastClickTime = 0;
        this.lastClickedTable = null;
        return;
      }
      this.lastClickTime = now;
      this.lastClickedTable = clicked.table;

      this.isDragging = true;
      this.draggedNode = clicked;
      this.dragOffset = { x: worldX - clicked.x, y: worldY - clicked.y };

      // Toggle selection
      if (this.selectedTable === clicked.table) {
        this.selectedTable = null;
      } else {
        this.selectedTable = clicked.table;
      }

      this.updateStatusBanner();
      this.highlightTableCard(clicked.table);
      this.draw();
    } else {
      // Background click: start panning the canvas
      this.isPanning = true;
      this.panStart = { x: screenX - this.panX, y: screenY - this.panY };
      this.canvas.style.cursor = 'grabbing';
      
      // If clicking empty canvas and didn't drag, clear selection
      this.selectedTable = null;
      this.updateStatusBanner();
      this.draw();
    }
  }

  handlePointerMove(e) {
    const coords = this.getPointerCoords(e);
    const { screenX, screenY, worldX, worldY } = coords;

    if (this.isDragging && this.draggedNode) {
      this.hasMoved = true;
      this.draggedNode.x = Math.round(worldX - this.dragOffset.x);
      this.draggedNode.y = Math.round(worldY - this.dragOffset.y);
      this.draggedNode.userDragged = true;
      this.canvas.style.cursor = 'move';
      this.draw();
      return;
    }

    if (this.isPanning) {
      this.hasMoved = true;
      this.panX = screenX - this.panStart.x;
      this.panY = screenY - this.panStart.y;
      this.draw();
      return;
    }

    // Test hover over nodes
    const hovered = this.nodes.find(n => 
      worldX >= n.x && worldX <= n.x + n.width && worldY >= n.y && worldY <= n.y + n.height
    );

    if (hovered) {
      if (this.hoveredTable !== hovered.table) {
        this.hoveredTable = hovered.table;
        this.canvas.style.cursor = 'pointer';
        this.draw();
      }
    } else {
      if (this.hoveredTable) {
        this.hoveredTable = null;
        this.canvas.style.cursor = 'grab';
        this.draw();
      }
    }
  }

  handlePointerUp() {
    this.isDragging = false;
    this.draggedNode = null;
    this.isPanning = false;
    if (this.canvas) {
      this.canvas.style.cursor = this.hoveredTable ? 'pointer' : 'grab';
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || 1);
    const scaleY = this.canvas.height / (rect.height || 1);

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

    if (newScale !== this.scale) {
      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.draw();
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.handlePointerDown(e);
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      this.isPanning = false;
      this.isDragging = false;
      this._touchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 1) {
      this.handlePointerMove(e);
    } else if (e.touches.length === 2 && this._touchDist) {
      // Pinch to zoom move
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / this._touchDist;
      this._touchDist = dist;
      this.zoomAtCenter(factor);
    }
  }

  zoomAtCenter(factor) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);

    if (newScale !== this.scale) {
      this.panX = cx - (cx - this.panX) * (newScale / this.scale);
      this.panY = cy - (cy - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.draw();
    }
  }

  zoomToFit() {
    if (!this.canvas || !this.nodes || this.nodes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    });

    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;

    if (diagramWidth <= 0 || diagramHeight <= 0) return;

    const padding = 60;
    const availWidth = Math.max(this.canvas.width - padding * 2, 200);
    const availHeight = Math.max(this.canvas.height - padding * 2, 200);

    const scaleX = availWidth / diagramWidth;
    const scaleY = availHeight / diagramHeight;
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.25);

    this.scale = fitScale;
    this.panX = Math.round((this.canvas.width - diagramWidth * this.scale) / 2 - minX * this.scale);
    this.panY = Math.round((this.canvas.height - diagramHeight * this.scale) / 2 - minY * this.scale);

    this.draw();
  }

  resetView() {
    this.zoomToFit();
  }

  autoRearrange() {
    this.nodes.forEach(n => { n.userDragged = false; });
    this.computeNodeLayout();
    this.zoomToFit();
  }

  centerOnNode(node) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.panX = cx - (node.x + node.width / 2) * this.scale;
    this.panY = cy - (node.y + node.height / 2) * this.scale;
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0) return;

    const isFullscreen = !!document.fullscreenElement;
    const targetWidth = Math.round(rect.width);
    const targetHeight = isFullscreen
      ? Math.round(window.innerHeight)
      : Math.max(Math.round(rect.height || parent.clientHeight || 620), 540);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.computeNodeLayout();
      this.zoomToFit();
    }
  }

  render(schemaData, relationships) {
    this.tables = schemaData.tables || [];
    this.relationships = relationships || [];
    this.resizeCanvas();
    this.computeNodeLayout();
    this.zoomToFit();
    this.drawOverview();
    this.renderTabularCards();
    this.renderRelationshipMatrix();
    this.updateStatusBanner();
  }

  computeNodeLayout() {
    const width = this.canvas.width || 900;
    const height = this.canvas.height || 620;
    const count = this.tables.length;

    if (count === 0) {
      this.nodes = [];
      return;
    }

    const nodeWidth = 200;
    const centerX = width / 2;
    const centerY = height / 2;

    const hasEnterpriseTables = this.tables.some(t => t.table.toLowerCase() === 'customers') &&
                                this.tables.some(t => t.table.toLowerCase() === 'orders');

    if (hasEnterpriseTables && count === 6) {
      // 2-row x 3-col architectural layout spanning the full canvas height and width
      const col1X = Math.round(width * 0.16 - nodeWidth / 2);
      const col2X = Math.round(width * 0.50 - nodeWidth / 2);
      const col3X = Math.round(width * 0.84 - nodeWidth / 2);

      const topY = Math.round(height * 0.22 - 70);
      const bottomY = Math.round(height * 0.74 - 70);

      const positions = {
        'products': { x: col1X, y: topY },
        'categories': { x: col2X, y: topY },
        'customers': { x: col3X, y: topY },
        'payments': { x: col1X, y: bottomY },
        'orders': { x: col2X, y: bottomY },
        'order_items': { x: col3X, y: bottomY }
      };

      this.nodes = this.tables.map(t => {
        const existing = this.nodes.find(n => n.table.toLowerCase() === t.table.toLowerCase());
        if (existing && existing.userDragged) {
          existing.rowCount = t.rowCount;
          existing.columns = t.columns;
          return existing;
        }

        const pos = positions[t.table.toLowerCase()] || { x: centerX - nodeWidth / 2, y: centerY - 60 };
        return {
          table: t.table,
          rowCount: t.rowCount,
          columns: t.columns,
          x: pos.x,
          y: pos.y,
          width: nodeWidth,
          height: Math.min(65 + Math.min((t.columns || []).length, 5) * 18, 165),
          userDragged: false
        };
      });
    } else {
      // Dynamic elliptical arrangement spanning full dimensions
      const radiusX = Math.max(Math.min(width * 0.38, width / 2 - 130), 180);
      const radiusY = Math.max(Math.min(height * 0.38, height / 2 - 100), 140);

      this.nodes = this.tables.map((t, i) => {
        const existing = this.nodes.find(n => n.table.toLowerCase() === t.table.toLowerCase());
        if (existing && existing.userDragged) {
          existing.rowCount = t.rowCount;
          existing.columns = t.columns;
          return existing;
        }

        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const x = Math.round(centerX + radiusX * Math.cos(angle) - nodeWidth / 2);
        const y = Math.round(centerY + radiusY * Math.sin(angle) - 60);

        return {
          table: t.table,
          rowCount: t.rowCount,
          columns: t.columns,
          x,
          y,
          width: nodeWidth,
          height: Math.min(65 + Math.min((t.columns || []).length, 5) * 18, 165),
          userDragged: false
        };
      });
    }
  }

  /* -------------------------------------------------------------------
   * Draw Method: Renders Transformed World Coordinates
   * ------------------------------------------------------------------- */
  draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Reset transform to clear full canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Subtle Tech Grid Background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 24 * this.scale;
    const startX = this.panX % gridSize;
    const startY = this.panY % gridSize;

    for (let x = startX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apply Viewport Pan & Zoom Transform
    ctx.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);

    // 2. Draw Relationships (Curved Bezier Lines with Flow Particles)
    this.relationships.forEach(rel => {
      const fromNode = this.nodes.find(n => n.table.toLowerCase() === rel.fromTable.toLowerCase());
      const toNode = this.nodes.find(n => n.table.toLowerCase() === rel.toTable.toLowerCase());

      if (fromNode && toNode) {
        const isConnectedToSelected = this.selectedTable && 
          (this.selectedTable.toLowerCase() === fromNode.table.toLowerCase() || 
           this.selectedTable.toLowerCase() === toNode.table.toLowerCase());

        const isDimmed = this.selectedTable && !isConnectedToSelected;

        // Calculate Edge-to-Edge Connection Anchors
        const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
        const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };

        const startPt = this.getNodeEdgeIntersection(fromNode, toCenter);
        const endPt = this.getNodeEdgeIntersection(toNode, fromCenter);

        const cpX = (startPt.x + endPt.x) / 2;
        const cpY = (startPt.y + endPt.y) / 2 + (startPt.x > endPt.x ? 25 : -25);

        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.quadraticCurveTo(cpX, cpY, endPt.x, endPt.y);

        if (isConnectedToSelected) {
          ctx.strokeStyle = '#00D9FF';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00D9FF';
          ctx.shadowBlur = 14;
          // Animated Marching Dashes showing flow direction
          ctx.lineDashOffset = this.dashOffset;
          ctx.setLineDash([8, 6]);
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(22, 119, 255, 0.45)';
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]); // Reset line dash

        // Draw Arrowhead at End Point
        this.drawArrowhead(ctx, cpX, cpY, endPt.x, endPt.y, isConnectedToSelected ? '#00D9FF' : (isDimmed ? '#22314D' : '#1677FF'));

        // Draw Cardinality Badge (1:N) at Midpoint
        ctx.beginPath();
        ctx.arc(cpX, cpY, 12, 0, Math.PI * 2);
        ctx.fillStyle = isConnectedToSelected ? '#00D9FF' : (isDimmed ? '#091226' : '#111E33');
        ctx.fill();
        ctx.strokeStyle = isConnectedToSelected ? '#00D9FF' : (isDimmed ? '#22314D' : '#1677FF');
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isConnectedToSelected ? '#060B16' : (isDimmed ? '#64748B' : '#F1F5F9');
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rel.cardinality || '1:N', cpX, cpY);
      }
    });

    // 3. Draw Entity Table Cards
    this.nodes.forEach(node => {
      const isSelected = this.selectedTable && this.selectedTable.toLowerCase() === node.table.toLowerCase();
      const isHovered = this.hoveredTable && this.hoveredTable.toLowerCase() === node.table.toLowerCase();
      const isSearchMatch = this.searchFilter && node.table.toLowerCase().includes(this.searchFilter);
      
      const isConnected = this.selectedTable && this.relationships.some(r => 
        (r.fromTable.toLowerCase() === this.selectedTable.toLowerCase() && r.toTable.toLowerCase() === node.table.toLowerCase()) ||
        (r.toTable.toLowerCase() === this.selectedTable.toLowerCase() && r.fromTable.toLowerCase() === node.table.toLowerCase())
      );

      const isDimmed = (this.selectedTable && !isSelected && !isConnected) || (this.searchFilter && !isSearchMatch);

      // Card Background
      ctx.beginPath();
      this.roundRect(ctx, node.x, node.y, node.width, node.height, 10);
      ctx.fillStyle = isSelected ? '#112240' : (isDimmed ? '#080E1C' : '#0D172A');
      ctx.fill();

      // Card Border & Glow
      if (isSelected || isSearchMatch) {
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00D9FF';
        ctx.shadowBlur = 16;
      } else if (isConnected) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 10;
      } else if (isHovered) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = isDimmed ? 'rgba(255, 255, 255, 0.05)' : '#22314D';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Card Header
      ctx.beginPath();
      this.roundRectTop(ctx, node.x, node.y, node.width, 32, 10);
      ctx.fillStyle = isSelected ? '#152C52' : (isDimmed ? '#0A1224' : '#111E33');
      ctx.fill();

      // Header Divider Line
      ctx.beginPath();
      ctx.moveTo(node.x, node.y + 32);
      ctx.lineTo(node.x + node.width, node.y + 32);
      ctx.strokeStyle = isSelected ? 'rgba(0, 217, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Table Icon & Name
      ctx.fillStyle = isSelected ? '#FFFFFF' : (isDimmed ? '#64748B' : '#FFFFFF');
      ctx.font = 'bold 12px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.table, node.x + 12, node.y + 16);

      // Row Count Badge
      ctx.fillStyle = isSelected ? '#00D9FF' : '#94A3B8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${node.rowCount}r`, node.x + node.width - 12, node.y + 16);

      // Columns Preview List
      const previewCols = (node.columns || []).slice(0, 5);
      let colY = node.y + 48;

      previewCols.forEach(col => {
        const isPk = col.primaryKey || col.pk;
        const isFk = this.relationships.some(r => 
          r.fromTable.toLowerCase() === node.table.toLowerCase() && r.fromCol.toLowerCase() === col.name.toLowerCase()
        );

        ctx.textAlign = 'left';
        ctx.font = '10px "JetBrains Mono", monospace';
        
        if (isPk) {
          ctx.fillStyle = '#F59E0B'; // Amber Primary Key
          ctx.fillText('🔑 ' + col.name, node.x + 10, colY);
        } else if (isFk) {
          ctx.fillStyle = '#00D9FF'; // Cyan Foreign Key
          ctx.fillText('🔗 ' + col.name, node.x + 10, colY);
        } else {
          ctx.fillStyle = isDimmed ? '#475569' : '#CBD5E1';
          ctx.fillText('• ' + col.name, node.x + 10, colY);
        }

        // Data type
        ctx.textAlign = 'right';
        ctx.fillStyle = isDimmed ? '#334155' : '#64748B';
        ctx.font = '9px "JetBrains Mono", monospace';
        const typeStr = (col.type || 'TEXT').substring(0, 8).toUpperCase();
        ctx.fillText(typeStr, node.x + node.width - 10, colY);

        colY += 18;
      });
    });

    // Reset transform after drawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* -------------------------------------------------------------------
   * Helper: Calculate Node Edge Intersection for Clean Bezier Connectors
   * ------------------------------------------------------------------- */
  getNodeEdgeIntersection(node, targetPoint) {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const dx = targetPoint.x - cx;
    const dy = targetPoint.y - cy;

    if (Math.abs(dx) * (node.height / 2) > Math.abs(dy) * (node.width / 2)) {
      // Intersects left or right edge
      const edgeX = dx > 0 ? node.x + node.width : node.x;
      const edgeY = cy + (dy * (edgeX - cx)) / (dx || 1);
      return { x: edgeX, y: edgeY };
    } else {
      // Intersects top or bottom edge
      const edgeY = dy > 0 ? node.y + node.height : node.y;
      const edgeX = cx + (dx * (edgeY - cy)) / (dy || 1);
      return { x: edgeX, y: edgeY };
    }
  }

  drawArrowhead(ctx, fromX, fromY, toX, toY, color) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLen = 9;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLen * Math.cos(angle - Math.PI / 6),
      toY - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowLen * Math.cos(angle + Math.PI / 6),
      toY - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  roundRectTop(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  selectTable(tableName) {
    this.selectedTable = this.selectedTable === tableName ? null : tableName;
    if (this.selectedTable) {
      const match = this.nodes.find(n => n.table.toLowerCase() === this.selectedTable.toLowerCase());
      if (match) this.centerOnNode(match);
    }
    this.draw();
    this.updateStatusBanner();
    this.highlightTableCard(tableName);
  }

  updateStatusBanner() {
    const banner = document.getElementById('er-status-banner');
    if (!banner) return;

    if (!this.selectedTable) {
      banner.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-info-circle text-cyan me-2"></i>
          <span>Click table to isolate • Drag nodes to reposition • Scroll to zoom • Drag canvas to pan • Double-click node to preview records</span>
        </div>
      `;
      return;
    }

    // Find related tables
    const related = [];
    this.relationships.forEach(r => {
      if (r.fromTable.toLowerCase() === this.selectedTable.toLowerCase()) {
        related.push({ table: r.toTable, label: `${r.fromCol} ➔ ${r.toCol}` });
      } else if (r.toTable.toLowerCase() === this.selectedTable.toLowerCase()) {
        related.push({ table: r.fromTable, label: `${r.fromCol} ➔ ${r.toCol}` });
      }
    });

    const relatedChips = related.length > 0 
      ? related.map(rel => `
          <button class="btn btn-xs btn-outline-info text-cyan border-cyan-500/40 py-0 px-2 text-xs me-1 font-mono" onclick="window.app.erVisualizer.selectTable('${rel.table}')">
            ${rel.table} (${rel.label})
          </button>
        `).join('')
      : '<span class="text-muted fst-italic">No direct foreign keys mapped</span>';

    banner.innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge bg-cyan-500/20 text-cyan border border-cyan-500/40">SELECTED: ${this.selectedTable}</span>
        <span class="text-secondary font-mono text-xs">Linked with:</span>
        <div class="d-inline-flex flex-wrap gap-1">${relatedChips}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-xs btn-outline-success py-0 px-2 text-xs font-semibold" onclick="window.app.previewTableData('${this.selectedTable}')">
          <i class="bi bi-table me-1"></i> Preview Records
        </button>
        <button class="btn btn-xs btn-outline-secondary py-0 px-2 text-xs" onclick="window.app.erVisualizer.selectTable(null)">
          Clear Selection
        </button>
      </div>
    `;
  }

  highlightTableCard(tableName) {
    if (!tableName) return;
    const cardEl = document.getElementById(`table-card-${tableName}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      cardEl.style.borderColor = '#00D9FF';
      cardEl.style.boxShadow = '0 0 16px rgba(0, 217, 255, 0.4)';
      setTimeout(() => {
        cardEl.style.borderColor = '';
        cardEl.style.boxShadow = '';
      }, 2400);
    }
  }

  /* -------------------------------------------------------------------
   * Table Form Schema Explorer Cards
   * ------------------------------------------------------------------- */
  renderTabularCards() {
    const container = document.getElementById('tabular-schema-container');
    if (!container) return;

    if (this.tables.length === 0) {
      container.innerHTML = `<div class="text-center text-muted py-4">No schema tables available.</div>`;
      return;
    }

    container.innerHTML = this.tables.map(t => {
      const fks = this.relationships.filter(r => r.fromTable.toLowerCase() === t.table.toLowerCase());

      return `
        <div class="col-md-6 col-xl-4 mb-4" id="table-card-${t.table}">
          <div class="card card-custom h-100 p-3 table-schema-card">
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary">
              <div class="d-flex align-items-center gap-2 cursor-pointer" onclick="window.app.erVisualizer.selectTable('${t.table}')">
                <span class="badge bg-blue-900/40 text-cyan p-2"><i class="bi bi-table"></i></span>
                <h6 class="text-white font-outfit mb-0 fw-bold fs-6">${t.table}</h6>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-slate-900 text-slate-300 border border-secondary font-mono text-xs">${t.rowCount} rows</span>
                <button class="btn btn-xs btn-outline-info text-cyan border-cyan-500/40 py-0 px-2 text-xs font-semibold" onclick="window.app.previewTableData('${t.table}')" title="Preview Live Rows">
                  <i class="bi bi-eye me-1"></i> Preview
                </button>
              </div>
            </div>

            <!-- Columns Table -->
            <div class="table-responsive flex-grow-1">
              <table class="table table-sm table-borderless text-xs font-mono mb-2">
                <thead>
                  <tr class="text-cyan text-uppercase border-bottom border-secondary">
                    <th class="ps-1">Column</th>
                    <th>Type</th>
                    <th class="text-end pe-1">Key</th>
                  </tr>
                </thead>
                <tbody>
                  ${(t.columns || []).map(c => {
                    const isPk = c.primaryKey || c.pk;
                    const fkRel = fks.find(f => f.fromCol.toLowerCase() === c.name.toLowerCase());
                    return `
                      <tr>
                        <td class="text-white ps-1 py-1 font-semibold">
                          ${isPk ? '<i class="bi bi-key-fill text-warning me-1"></i>' : (fkRel ? '<i class="bi bi-link-45deg text-cyan me-1"></i>' : '<span class="text-muted me-1">•</span>')}
                          ${c.name}
                        </td>
                        <td class="text-secondary py-1">${c.type}</td>
                        <td class="text-end pe-1 py-1">
                          ${isPk ? '<span class="badge bg-warning/20 text-warning border border-warning/40">PK</span>' : ''}
                          ${fkRel ? `<span class="badge bg-cyan/20 text-cyan border border-cyan/40" title="Links to ${fkRel.toTable}.${fkRel.toCol}">FK</span>` : ''}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Foreign Key Links Footer -->
            ${fks.length > 0 ? `
              <div class="mt-auto pt-2 border-top border-secondary text-xs font-mono">
                <span class="text-secondary d-block mb-1">🔗 Foreign Key Relations:</span>
                ${fks.map(f => `
                  <div class="text-light text-truncate">
                    <span class="text-cyan">${f.fromCol}</span> ➔ <span class="text-success-green">${f.toTable}.${f.toCol}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /* -------------------------------------------------------------------
   * Whole Database Relationship Matrix
   * ------------------------------------------------------------------- */
  renderRelationshipMatrix() {
    const container = document.getElementById('relationship-matrix-container');
    if (!container) return;

    if (this.relationships.length === 0) {
      container.innerHTML = `<div class="text-muted text-xs py-2">No explicit foreign key relationships mapped for active database.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="row g-3">
        ${this.relationships.map(r => `
          <div class="col-md-6 col-lg-4">
            <div class="p-3 bg-slate-900 rounded-3 border border-secondary h-100 cursor-pointer" onclick="window.app.erVisualizer.selectTable('${r.fromTable}')">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-blue-900/60 text-cyan font-mono text-xs border border-cyan-500/40">
                  ${r.cardinality || 'N:1'}
                </span>
                <span class="text-xs text-muted font-outfit">${r.type || 'Foreign Key'}</span>
              </div>
              <div class="d-flex align-items-center gap-2 mb-2 font-mono text-xs">
                <span class="px-2 py-1 bg-slate-800 text-cyan rounded font-bold">${r.fromTable}.${r.fromCol}</span>
                <i class="bi bi-arrow-right text-muted"></i>
                <span class="px-2 py-1 bg-slate-800 text-success-green rounded font-bold">${r.toTable}.${r.toCol}</span>
              </div>
              <p class="text-xs text-secondary mb-0">${r.description || 'Relational join linkage between entities.'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* -------------------------------------------------------------------
   * Compact Schema & ER Overview Panel
   * ------------------------------------------------------------------- */
  drawOverview() {
    const canvas = document.getElementById('er-overview-canvas');
    if (!canvas) return;
    const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : null;
    const width = rect && rect.width > 0 ? Math.round(rect.width) : 600;
    const height = 280;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!this.tables || this.tables.length === 0) return;

    const nodeMap = {};
    const cols = Math.min(3, Math.ceil(this.tables.length / 2));
    const colW = (width - 30) / (cols || 1);
    this.tables.forEach((t, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      nodeMap[t.table.toLowerCase()] = {
        x: 15 + c * colW,
        y: 20 + r * 120,
        w: colW - 15,
        h: 95,
        isHero: i === 0
      };
    });

    this.relationships.forEach(rel => {
      const fromPos = nodeMap[rel.fromTable.toLowerCase()];
      const toPos = nodeMap[rel.toTable.toLowerCase()];
      if (fromPos && toPos) {
        const startX = fromPos.x + fromPos.w / 2;
        const startY = fromPos.y + fromPos.h / 2;
        const endX = toPos.x + toPos.w / 2;
        const endY = toPos.y + toPos.h / 2;

        ctx.beginPath();
        const cpX = (startX + endX) / 2;
        const cpY = (startY + endY) / 2 + (startX > endX ? 18 : -18);
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);

        ctx.strokeStyle = '#00A6FF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cpX, cpY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#091226';
        ctx.fill();
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#00D9FF';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('1:N', cpX, cpY);
      }
    });

    this.tables.forEach(t => {
      const pos = nodeMap[t.table.toLowerCase()];
      if (!pos) return;

      const isHero = pos.isHero;
      const { x, y, w, h } = pos;
      const radius = 8;

      ctx.beginPath();
      this.roundRect(ctx, x, y, w, h, radius);
      ctx.fillStyle = '#0D172A';
      ctx.fill();

      if (isHero) {
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 217, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = '#22314D';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHero ? '#00D9FF' : '#F1F5F9';
      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.fillText(t.table, x + 8, y + 14);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748B';
      ctx.font = '9px "JetBrains Mono", monospace';
      const rowTxt = t.rowCount !== undefined ? `(${t.rowCount}r)` : '';
      ctx.fillText(rowTxt, x + w - 8, y + 14);

      ctx.beginPath();
      ctx.moveTo(x + 6, y + 24);
      ctx.lineTo(x + w - 6, y + 24);
      ctx.strokeStyle = isHero ? 'rgba(0, 217, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const colsPreview = (t.columns || []).slice(0, 4);
      colsPreview.forEach((col, idx) => {
        const itemY = y + 36 + idx * 17;
        if (itemY > y + h - 5) return;

        const isPk = col.pk || col.primaryKey || (col.name.toLowerCase().endsWith('_id') && idx === 0);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        if (isPk) {
          ctx.fillStyle = '#F59E0B';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText('🔑', x + 6, itemY);
        } else {
          ctx.fillStyle = '#38BDF8';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText('•', x + 8, itemY);
        }

        ctx.fillStyle = isPk ? '#F1F5F9' : '#CBD5E1';
        ctx.font = (isPk ? 'bold ' : '') + '10px "JetBrains Mono", monospace';
        const truncatedName = col.name.length > 12 ? col.name.substring(0, 11) + '..' : col.name;
        ctx.fillText(truncatedName, x + 20, itemY);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748B';
        ctx.font = '8px "JetBrains Mono", monospace';
        const typeShort = (col.type || 'INT').split('(')[0].toUpperCase();
        ctx.fillText(typeShort, x + w - 8, itemY);
      });
    });
  }
}
