import { LatLng } from "leaflet";
import { Events } from "obsidian";
import { Marker } from "src/layer";
import { MarkerDivIcon } from "src/map";
import { getId } from "src/utils";
import { LeafletSymbol } from "src/utils/leaflet-import";
import { Shape } from "./shape";
const L = window[LeafletSymbol];

class VertexIcon extends MarkerDivIcon {
    constructor() {
        super({
            iconSize: new L.Point(8, 8),
            className: "leaflet-div-icon leaflet-vertex-icon"
        });
    }
}

declare module "leaflet" {
    interface Marker {
        _icon: HTMLElement;
    }
}

export class Vertex extends Events {
    leafletInstance: L.Marker;
    selected: boolean = false;
    isBeingHovered: boolean = false;
    marker: Marker;
    vertices: Set<Vertex> = new Set();
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    setLatLng(latlng: L.LatLng) {
        this.leafletInstance.setLatLng(latlng);
        this.parent.redraw();
        if (this.marker) {
            this.marker.leafletInstance.setLatLng(latlng);
        }
        console.log(this.marker);
        this.vertices.forEach((v) => v.updateLatLng(latlng));
    }
    updateLatLng(latlng: LatLng): void {
        this.leafletInstance.setLatLng(latlng);
        this.onDrag();
        this.parent.redraw();
    }
    constructor(
        public latlng: L.LatLng,
        public parent: Shape<L.Path>,
        targets?: {
            marker?: Marker;
            vertices?: Vertex[];
        }
    ) {
        super();

        this.marker = targets?.marker;
        this.addVertexTargets(...(targets?.vertices ?? []));

        this.leafletInstance = new L.Marker(latlng, {
            icon: new VertexIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);

        this.registerDragEvents();

        if (this.vertices.size) {
            this.vertices.forEach((v) => {
                v.addVertexTargets(this);
                v.marker = this.marker;
            });
        }
    }

    addVertexTargets(...vertices: Vertex[]) {
        for (let vertex of vertices) {
            this.vertices.add(vertex);
            console.log(vertex.marker, this.marker);
            if (vertex.marker) {
                this.marker = vertex.marker;
            } else if (this.marker) {
                vertex.marker = this.marker;
            }
            vertex.on("delete", () => {
                this.vertices.delete(vertex);
            });
        }
    }

    registerDragEvents() {
        this.leafletInstance.on("drag", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);

            let latlng = evt.latlng;
            if (!evt.originalEvent.getModifierState("Shift")) {
                if (
                    this.parent.controller.vertices.find(
                        (v) => v.isBeingHovered
                    )
                ) {
                    const vertex = this.parent.controller.vertices.find(
                        (v) => v.isBeingHovered
                    );
                    latlng = vertex.getLatLng();
                } else if (
                    this.parent.map.markers.find((m) => m.isBeingHovered)
                ) {
                    const marker = this.parent.map.markers.find(
                        (m) => m.isBeingHovered
                    ).leafletInstance;
                    latlng = marker.getLatLng();
                }
            }

            this.setLatLng(latlng);
            this.onDrag();
        });
        this.leafletInstance.on("mouseover", () => {
            this.isBeingHovered = true;
        });
        this.leafletInstance.on("mouseout", () => {
            this.isBeingHovered = false;
        });
        this.leafletInstance.on("dragstart", () => {
            this.selected = true;
        });
        this.leafletInstance.on("dragend", () => {
            this.selected = false;
            this.parent.redraw();
        });
        this.leafletInstance.on("click", (evt: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(evt);
            if (this.parent.controller.isDrawing) {
                console.log(
                    "🚀 ~ file: vertex.ts ~ line 100 ~ this.parent.controller.isDrawing",
                    this.parent,
                    this.parent.controller.shape
                );
                this.parent.controller.shape.onClick(evt, {
                    vertices: [this, ...this.vertices]
                });
            }
        });
        this.registerTargetEvents();
    }
    unregisterTargetEvents() {
        if (this.marker) {
            this.marker.leafletInstance.off("drag", this.onTargetDrag, this);
        }
    }
    onTargetDrag(evt: L.LeafletMouseEvent) {
        this.leafletInstance.fire("drag", evt);
    }
    registerTargetEvents() {
        if (this.marker) {
            this.marker.leafletInstance.on("drag", this.onTargetDrag, this);
        }
    }
    delete() {
        this.trigger("delete");
        this.unregisterTargetEvents();
        this.hide();
    }
    onDrag() {}
    hide() {
        this.leafletInstance.remove();
    }
    show() {
        this.leafletInstance.addTo(this.parent.map.leafletInstance);
    }
}
class MidIcon extends L.DivIcon {
    constructor() {
        super({
            iconSize: new L.Point(6, 6),
            className: "leaflet-div-icon leaflet-mid-icon"
        });
    }
}

export class MiddleVertex {
    leafletInstance: L.Marker;
    getLatLng() {
        return this.leafletInstance.getLatLng();
    }
    constructor(public latlng: L.LatLng, public parent: Shape<L.Path>) {
        this.leafletInstance = new L.Marker(latlng, {
            icon: new MidIcon(),
            draggable: true,
            pane: "drawing-markers"
        }).addTo(this.parent.map.leafletInstance);
    }
}
