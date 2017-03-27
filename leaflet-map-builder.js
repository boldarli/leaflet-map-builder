/**
 * @author : gherardo varando (gherardo.varando@gmail.com)
 *
 * @license: GPL v3
 *     This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.


 */
'use strict';

const leafelt = require('leaflet');

if (L != undefined) {

    L.MapBuilder = L.Evented.extend({
        _l: null,
        _configuration: {},
        _events: [],
        _layers: {},
        _controls: {},
        _activeBaseLayer: null,
        _options: {
            drawingColor: "#ed8414",
            controls: {
                draw: false, // logical, options of configuration
                zoom: false, // logical, options of configuration
                layers: false // logical, options of configuration or function for external control
            },
            polygon: {
                tooltip: false,
                popup: false
            },
            marker: {
                tooltip: false,
                popup: false
            },
            rectangle: {
                tooltip: false,
                popup: false
            },
            circle: {
                tooltip: false,
                popup: false
            }
        },

        initialize: function(map, options, configuration) {
            try {
                this.setMap(map);
                this.setOptions(options);
                this.setConfiguration(configuration || {
                    type: 'map'
                });
            } catch (e) {
                console.log(e);
            }
        },


        setMap: function(map) {
            if (map instanceof L.Map) {
                this._l = map;
                this.fire("map-added", map);
            } else {
                throw {
                    type: "map error",
                    map: map
                };
            }

        },

        _parse: function(configuration) { // add some more
            if (typeof configuration === 'string') {
                configuration = JSON.parse(configuration);
            }
            configuration.type = configuration.type || 'undefined';
            if (configuration.type.includes("map")) {
                //return Object.assign({}, configuration);
                return configuration;
            } else {
                throw 'ERROR: configuration must have "type":"..map.." ';
            }
        },

        setConfiguration: function(configuration) {
            try {
                this._configuration = this._parse(configuration);
                this.fire('set:configuration', {
                    configuration: configuration
                });
                //this.reload();
            } catch (e) {
                this.setConfiguration({
                    type: 'map'
                });
                throw e;
            }
        },

        // return a copy of the configuration object
        getConfiguration: function() {
          //  return Object.assign({}, this._configuration);
          return this._configuration;
        },

        setOptions: function(options) {
            if (!options) return;
            Object.assign(this._options, options);
            this.reload();
        },

        //clean the map
        clean: function() {
            if (this._l) {
                this._l.eachLayer((layer) => {
                    this._l.removeLayer(layer);
                });
                if (this._controls.draw instanceof L.Control.Draw) {
                    this._l.removeControl(this._controls.draw);
                }
                if (this._controls.layers instanceof L.Control.Layers) {
                    this._l.removeControl(this._controls.layers);
                }
                if (this._controls.zoom instanceof L.Control.Zoom) {
                    this._l.removeControl(this._controls.zoom);
                }
                this._removeMapListener();
            }
            this._state.baseLayerOn = false;
            this._events = [];
            this._configuration = {
                type: 'map',
                layers: {}
            };
            this._layers = {};
            this._controls = {};
            this._activeBaseLayer = null;
            this.fire('clean');
        },

        _removeMapListener: function() {
            if (this._l) {
                this._events.map((ev) => {
                    this._l.off(ev);
                });
            }
        },

        reload: function() {
            if (!this._l) {
                return;
            } else {
                this.clean();
                if (this._options.layerControl) {
                    this.addLayerControl();
                }
                if (this._options.drawControl) {
                    this.addDrawnItems();
                    this.addDrawControl();
                }
                this.setMapOptions();
                this._indx = 0;
                this._layerindx = 0;
                //load all the layers
                if (this._configuration.layers) {
                    if (this._configuration.layers instanceof Array) {
                        this._configuration.layers.map((layer, index) => {
                            this._loadLayer(layer);
                        });
                    } else { //we assume is an object
                        for (let a in this._configuration.layers) {
                            this._loadLayer(this._configuration.layers[a]);
                        }
                    }
                }
                this.fitWorld();
                this.fire('reload');
            }
        },


        fitWorld() {
            this._l.fitWorld();
        },

        getDrawingColor: function() {
            if (typeof this._configuration.drawingColor === 'string') return this._configuration.drawingColor;
            return "#ed8414";
        },

        setDrawingColor: function(color) {
            if (typeof color === 'string') this._configuration.drawingColor = color;
        },

        setMaxZoom: function(zoom) {
            this._l.setMaxZoom(zoom);
            this.fire('set:maxZoom', {
                maxZoom: zoom
            });
        },

        setMinZoom: function(zoom) {
            this._l.setMinZoom(zoom);
            this.fire('set:minZoom', {
                minZoom: zoom
            });
        },

        loadLayer(configuration) {
            if (this._layers[configuration.name]) {
                this._updateLayer(configuration.name);
            } else {
                this._loadLayer(configuration);
            }
        },

        _loadLayer: function(layerConfiguration) {
            let layer;
            switch (layer.type) {
                case 'tilesLayer':
                    layer = this._loadTilesLayer(layerConfiguration);
                    break;
                case 'pointsLayer':
                    layer = this._loadPointsLayer(layerConfiguration);
                    break;
                case 'pixelsLayer':
                    layer = this._loadPixelsLayer(layerConfiguration);
                    break;
                case 'polygon':
                    layer = this._loadPolygon(layerConfiguration);
                    break;
                case 'marker':
                    layer = this._loadMarker(layerConfiguration);
                    break;
                case 'circleMarker':
                    layer = this._loadCircleMarker(layerConfiguration);
                    break;
                case 'guideLayer':
                    layer = this._loadGuideLayer(layerConfiguration);
                    break;
                case 'drawnPolygons':
                    layer = this._loadDrawnPolygons(layerConfiguration);
                    break;
                case 'polygons':
                    layer = this._loadPolygons(layerConfiguration);
                    break;
                case 'drawnMarkers':
                    layer = this._loadDrawnMarkers(layerConfiguration);
                    break;
                case 'imageLayer':
                    layer = this._loadImageLayer(layerConfiguration);
                    break;
                case 'featureGroup':
                    layer = this._loadFeatureGroup(layerConfiguration);
                    break;
                case 'layerGroup':
                    layer = this._loadLayerGroup(layerConfiguration);
                    break;
                default:
                    return;
            }
        },

        _updateLayer: function(name) {
            if (!this._layers[name]) return;

        },

        addLayer: function(layerConfiguration) {
            layer.id = this._layerindx;
        },

        renameLayer: function(old, now, where) {
            if (!old) return;
            if (!now) return;
            if (typeof where === 'string' ){
              where = this._layers[where];
            }
            if (!where) {
                    where = this;
            }
            if (!where._layers[old]) return;
            where._layers[old]._configuration.name = now;
            where._layers[now] = where._layers[old];
            delete where._layers[old];
            where._configuration.layers[now]=where._configuration.layers[old];
            delete where._configuration.layers[old];
            this.fire('rename:layer',{
              name: now,
              layer: where._layers[now]
            });

        },

        // //the leafletlayer
        // removeLayer: function(name) {
        //     let configuration;
        //     let llayer;
        //     if (typeof layer.addTo === 'function') {
        //         llayer = layer;
        //         configuration = layer._configuration;
        //     } else if ((typeof layer.name === 'string') && (typeof layer.type === 'string')) {
        //         if (layer.typeid >= 0) {
        //             llayer = this.getLayers(layer.type)[layer.typeid];
        //         }
        //         configuration = layer;
        //     }
        //     let layers = this.getLayers(configuration.type);
        //     layers.splice(layers.indexOf(llayer));
        //     //delete this._configuration.layers[configuration.name];
        //     if (llayer) {
        //         this._map.removeLayer(llayer);
        //     }
        //
        //     this.fire('remove:layer', {
        //         layer: llayer,
        //         configuration: configuration
        //     });
        // },

        onMap: function(ev, cl) {
            this._events.push(ev);
            this._l.on(ev, cl);
        },

        offMap: function(ev) {
            this._l.off(ev);
        },

        _addDrawnItems: function() {
            this._drawnItems = new L.FeatureGroup(); //where items are stored
            this._l.addLayer(this._drawnItems);
            if (this._layerControl) {
                this._layerControl.addOverlay(this._drawnItems, "Drawn Items");
            }
            this._layers.drawnItems = {
              _l: this_drawnItems,
              _layers: [],
              _configuration:{
                name: drawnItems,
                type: 'featureGroup',
                layers: {}
              }
            }
            this._configuration.layers.drawnItems = this._layers.drawnItems._configuration;
            this.fire('add:drawnitems', {
                layer: this._drawnItems
            });
        },

        _addDrawControl: function() {
            if (!L.Control.Draw) return;
            if (!(this._drawnItems instanceof L.FeatureGroup)) {
                this.addDrawnItems();
            }
            let options = {};
            if (!this._options.drawControl) {
                options.draw = false;
                options.edit = false;
            } else {
                Object.assign(options, this._options.drawControl);
                if (options.draw) {
                    options.draw = Object.assign({}, options.draw);
                }
                if (options.edit) {
                    options.edit = Object.assign({}, options.edit);
                    options.edit = Object.assign(options.edit, {
                        featureGroup: this._drawnItems
                    });
                }
            }
            let drawControl = new L.Control.Draw(options);
            this._drawControl = drawControl;
            this._l.addControl(drawControl);
            this._l.on('draw:created', (e) => {
                this._l.dragging.enable();
                let type = e.layerType,
                    layer = e.layer;
                this._drawnItems.addLayer(layer);
            });

            // when items are removed
            this._l.on('draw:deleted', (e) => {
                var layers = e.layers;
                layers.eachLayer((layer) => {
                    if (layer.getLatLngs) {
                        this.removePolygon(layer, false);
                    } else {
                        this.removeMarker(layer, false);
                    }

                });
            });

            this._l.on('draw:edited', (e) => {
                let layers = e.layers;
                layers.eachLayer((layer) => {
                    this.editDrawnLayer(layer);
                });
            });

            this._l.on('draw:drawstart', () => {
                this._l.dragging.disable();
            });

        },

        _addLayersControl: function() {
            if (typeof this._options.controls.layers === 'function') return; //external controls
            let options = Object.assign({}, this._options.controls.layers);
            this._controls.layers = L.control.layers(null, null, options);
            this._l.addControl(this._controls.layers);
            this.fire('add:control', {
                type: 'layers',
                control: this._controls.layers
            });
        },

        _addZoomControl: function() {
            let options = Object.assign({}, this._options.controls.zoom);
            this._controls.zoom = L.control.zoom(options);
            this._l.addControl(this._controls.zoom);
            this.fire('add:control', {
                type: 'zoom',
                control: this._controls.zoom
            });
        },

        _addAttributionControl: function() {
            let options = Object.assign({}, this._options.controls.attribution);
            this._controls.attribution = L.control.attribution(options);
            this._l.addControl(this._controls.attribution);
            this.fire('add:control', {
                type: 'atttribution',
                control: this._controls.attribution
            });
        },

        _loadPolygon: function(configuration, where) {
            if (!where) {
                if (this._layers.drawnItems) {
                    where = this._layers.drawnItems;
                } else {
                    where = this;
                }
            }
            configuration.name = configuration.name || `Region ${this._indx++}`;
            layer = L.polygon(configuration.latlngs ||
                configuration.latLngs ||
                configuration.path ||
                configuration.points ||
                configuration.coordinates ||
                configuration.coords || [configuration.lats || configuration.y, configuration.langs || configuration.x], configuration.options);
            if (this._options.region.tooltip) {
                layer.bindTooltip(configuration.name);
            } else if (configuration.tooltip) {
                layer.bindTooltip(configuration.tooltip.content, configuration.tooltip.options);
            }
            if (this._options.region.popup) {
                layer.bindPopup(`<strong>${configuration.name}</strong> <p> ${configuration.details || ''}</p>`);
            } else if (configuration.popup) {
                layer.bindPopup(configuration.popup.content, configuration.popup.options);
            }

            where._l.addLayer(layer);
            where._configuration.layers[configuration.name] = {
                _l : layer,
                configuration : configuration
            };

            this.fire('load:polygon', {
                layer: layer,
                configuration: configuration
            });
        },

        addPolygon: function(configuration, group) {
            if (group) {

            } else if (this._drawnItems) {
                this._configuration.layers.drawnPolygons = this._configuration.layers.drawnPolygons || {
                    name: 'drawnPolygons',
                    type: 'drawnPolygons',
                    polygons: {}
                };
                this._indx++;
                this._configuration.layers.drawnPolygons.polygons[`${this._indx}`] = configuration;
            }
        },

        _loadMarker: function(layer, where) {
            if (!where) {
                if (this._drawnItems) {
                    where = this._drawnItems;
                } else {
                    where = this._map;
                }
            }
            let lyjson = {};
            this._indx++;
            if (!layer.getLatLng) {
                lyjson = layer; //we assume layer is written in json format with at least a latlngs field
                lyjson.options = lyjson.options || {};
                lyjson.name = lyjson.name || `Marker ${this._indx}`;
                lyjson.details = lyjson.details || ``;
                layer = L.marker(lyjson.latlng ||
                    lyjson.latLng ||
                    lyjson.point ||
                    lyjson.coordinate ||
                    lyjson.coord || [lyjson.lat || lyjson.y, lyjson.lang || lyjson.x], {
                        //  icon: L.divIcon({className:'fa fa-map fa-2x'})
                    });
            } else { //assume the layer is already a L.marker
                lyjson = layer.configuration || {
                    latlng: layer.getLatLng(),
                    name: `Marker ${this._indx}`,
                    options: layer.options,
                    details: ``
                };
            }
            if (this._options.marker.tooltip) {
                layer.bindTooltip(lyjson.name);
            }
            if (this._options.marker.popup) {
                layer.bindPopup(`<strong>${lyjson.name}</strong> <p> ${lyjson.details || ''}</p>`);
            }
            layer.group = group;
            if (group) {
                group.addLayer(layer);
            } else if (this._drawnItems) {
                this._drawnItems.addLayer(layer);
            } else {
                this._map.addLayer(layer);
            }
            if (addToConfiguration) {
                this._configuration.layers.drawnMarkers = this._configuration.layers.drawnMarkers || {
                    name: 'drawnMarkers',
                    type: 'drawnMarkers',
                    markers: {}
                };
                this._configuration.layers.drawnMarkers.markers[`${this._indx}`] = lyjson;
            }
            lyjson.id = lyjson.id || this._indx;
            layer._id = lyjson.id;
            layer._configuration = lyjson;
            this._markers.push(layer);
            this.fire('add:marker', {
                layer: layer
            });
        },

        removeMarker: function(marker, removeFromMap) {
            if (removeFromMap) {
                if (marker.group) {
                    marker.group.removeLayer(marker);
                } else if (this._drawnItems) {
                    this._drawnItems.removeLayer(marker);
                } else {
                    this._map.removeLayer(marker);
                }
            }

            this._markers.splice(this._markers.indexOf(marker), 1);
            if (marker.group) {
                delete marker.group._configuration.markers[marker._id];
            } else {
                delete this._configuration.layers.drawnMarkers.markers[`${marker._id}`];
            }
            this.fire('remove:marker', {
                layer: marker
            });
        },

        removePolygon: function(polygon, removeFromMap) {
            if (removeFromMap) {
                if (polygon.group) {
                    polygon.group.removeLayer(polygon);
                } else if (this._drawnItems) {
                    this._drawnItems.removeLayer(polygon);
                } else {
                    this._map.removeLayer(polygon);
                }
            }

            this._polygons.splice(this._polygons.indexOf(polygon), 1);
            if (polygon.group) {
                delete polygon.group._configuration.polygons[polygon._id];
            } else {
                delete this._configuration.layers.drawnPolygons.polygons[polygon._id];
            }
            this.fire('remove:polygon', {
                layer: polygon
            });
        },

        addDrawnMarkers: function(layerConfig) {
            if (Array.isArray(layerConfig.markers)) {
                layerConfig.markers.map((pol) => {
                    this.addMarker(pol);
                });
            } else { //assume is an object
                Object.keys(layerConfig.markers).map((key) => {
                    this.addMarker(layerConfig.markers[key]);
                });
            }

            this.fire('add:drawnmarkers', {
                configuration: layerConfig
            });
        },

        addDrawnPolygons: function(layerConfig) {
            if (Array.isArray(layerConfig.polygons)) {
                layerConfig.polygons.map((pol) => {
                    pol.options.fillOpacity = 0.3;
                    this.addPolygon(pol);
                });
            } else { //assume is an object
                Object.keys(layerConfig.polygons).map((key) => {
                    layerConfig.polygons[key].options.fillOpacity = 0.3;
                    this.addPolygon(layerConfig.polygons[key]);
                });
            }

            this.fire('add:drawnpolygons', {
                configuration: layerConfig
            });

        },

        loadPolygons: function(configuration) {
            let group = L.layerGroup();
            this.addPolygon(...configuration.polygons, false, group);

            if (this._layerControl) {
                this._layerControl.addOverlay(group, layerConfig.name);
            } else if (!this._options.externalControl) {
                group.addTo(this._map);
            }
            this.fire('add:polygons', {
                layer: group,
                configuration: layerConfig
            });
        },

        loadPointsLayer: function(configuration) {
            if (configuration.pointsUrlTemplate) {
                let points = new pointsLayer(layer);
                // drawing part
                let layer = L.markerClusterGroup();
                layer.bindTooltip(configuration.name);
                if (this._layerControl) {
                    this._layerControl.addOverlay(layer, configuration.name);
                } else if (!this._options.externalControl) {
                    this._map.addLayer(layer);
                }
                this._layers.push(layer);
                this.fire('load:pointslayer', {
                    layer: layer,
                    configuration: configuration
                });
                let scale = points.configuration.size / this.getSize();
                points.count({
                    maxTiles: 10,
                    cl: (point) => {
                        if (point.some(x => isNaN(x))) return;
                        point = [-point[1] / scale, point[0] / scale];
                        let mk = L.circleMarker(point, Object.assign({
                            color: this.getDrawingColor(),
                            radius: 3
                        }, configuration));
                        layer.addLayer(mk);
                    },
                    error: (err) => {
                        console.log(err);
                    }
                });


            }

        },

        loadPixelsData: function(configuration) {
            if (layer.pixelsUrlTemplate) {
                let pixels = new pixelsLayer(configuration);
                this._data.pixels.push(pixels);

                this.fire('load:pixelsdata', {
                    pixels: pixels,
                    configuration: layer
                });
                // drawing part not implemented
            }

        },

        loadPointsData: function(configuration) {
            if (layer.pixelsUrlTemplate) {
                let points = new pointsLayer(layer);
                this._data.points.push(points);

                this.fire('load:pixelsdata', {
                    points: points,
                    configuration: configuration
                });
                // drawing part not implemented
            }

        },

        center: function() {
            this._map.setView([0, 0], 0);
        },

        getBaseLayer: function() {
            return this._activeBaseLayer || this._layers[0]; // FIX THAT
        },

        loadGuideLayer: function(layerConfig) {
            if (!this.getBaseLayer()) return;
            layerConfig.name = layerConfig.name || 'Guide';
            let guideLayer = L.featureGroup();
            this._layers.push(guideLayer);
            guideLayer.on("add", () => {
                this._guideLayers.map((g) => {
                    if (g === guideLayer) return;
                    this._map.removeLayer(g);
                });

                this._drawControl.setDrawingOptions({
                    polyline: {
                        guideLayers: [guideLayer]
                    },
                    polygon: {
                        guideLayers: [guideLayer],
                        snapDistance: 5
                    },
                    rectangle: {
                        guideLayers: [guideLayer],
                        snapDistance: 5
                    }
                });
            });
            guideLayer.on("remove", () => {
                this._drawControl.setDrawingOptions({
                    polyline: {
                        guideLayers: null
                    },
                    polygon: {
                        guideLayers: null
                    },
                    rectangle: {
                        guideLayers: null
                    }
                });
            });
            if (layerConfig.points) {

            } else {
                let scale = 1;
                let baselayer = this._activeBaseLayer || this._tilesLayers[0];
                if (layerConfig.size) {
                    scale = layerConfig.size / this.getSize();
                    let tileSize = layerConfig.tileSize || layerConfig.size;
                    if (tileSize > 0 && layerConfig.size < 100 * tileSize) {
                        for (let i = 0; i <= layerConfig.size; i = i + tileSize) {
                            for (let j = 0; j <= layerConfig.size; j = j + tileSize) {
                                guideLayer.addLayer(L.circleMarker([-i / scale, j / scale], {
                                    radius: layerConfig.radius || 4,
                                    color: layerConfig.color || this.getDrawingColor()
                                }));
                            }
                        }
                    }
                }
            }

            if (this._layerControl) {
                this._layerControl.addOverlay(guideLayer, layerConfig.name);
            } else if (!this._options.externalControl) {
                this._map.addLayer(guideLayer);
            }
            this.fire('load:guidelayer', {
                layer: guideLayer,
                configuration: layerConfig
            });

        },

        loadImageLayer: function(layerConfig) {
            if (layerConfig.imageUrl) { //check if there is an url
                let options = layerConfig.options || {
                    opacity: layerConfig.opacity || 1,
                };

                Object.keys(layerConfig).map((key) => { //copy all the attributes of layerConfig
                    options[key] = options[key] || layerConfig[key];
                });

                options.bounds = layerConfig.bounds || [
                    [-256, 0],
                    [0, 256]
                ];
                let layer = L.imageOverlay(basePath + options.imageUrl, options.bounds, options);
                layer._configuration = options;
                this._layers.push(layer);
                if (options.baseLayer) {
                    this._configuration.size = this._configuration.size || options.size;
                    this._activeBaseLayer = this._activeBaseLayer || layer;
                }
                if (options.baseLayer) {
                    layer.on("add", () => {
                        this._map.setMaxZoom(options.maxZoom);
                        this._map.setMinZoom(options.minZoom);
                        this._activeBaseLayer = layer;
                    });
                }
                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.name);
                        if (!this._state.baseLayerOn) {
                            this._map.addLayer(layer);
                            this._state.baseLayerOn = true;
                        }
                    } else {
                        this._layerControl.addOverlay(layer, options.name);
                    }
                } else if (!this._options.externalControl) {
                    this._map.addLayer(layer);
                }
                this._map.setView(options.view || [-100, 100], 0);
                this.fire('laod:imagelayer', {
                    layer: layer,
                    layerConfig: options
                });

            }

        },


        loadTilesLayer: function(layerConfig) {
            //create layer
            if (layerConfig.tilesUrlTemplate) { //check if there is the tilesUrlTemplate
                let options = Object.assign({}, layerConfig);
                if (Array.isArray(options.tileSize)) {
                    options.tileSize = L.point(options.tileSize[0], options.tileSize[1]);
                }
                if (options.tileSize.x && options.tileSize.y) {
                    options.tileSize = L.point(options.tileSize.x, options.tileSize.y);
                }

                let layer = L.tileLayer(options.tilesUrlTemplate, options);
                layer._configuration = layerConfig;
                this._layers.push(layer);

                if (options.baseLayer) {
                    layer.on("add", () => {
                        this._map.setMaxZoom(layerConfig.maxZoom);
                        this._activeBaseLayer = layer;
                        if (layer.options.customKeys) {
                            layer.unbindTooltip();
                            layer.bindTooltip(L.tooltip({
                                direction: 'left'
                            }));
                            layer.setTooltipContent(`slice ${layer.options.t}`);
                            layer.openTooltip([0, 0]);
                        }
                    });
                }
                if (this._layerControl) {
                    if (options.baseLayer) {
                        this._layerControl.addBaseLayer(layer, options.name);
                        if (!this._state.baseLayerOn) {
                            this._map.addLayer(layer);
                            this._state.baseLayerOn = true;
                        }
                    } else {
                        this._layerControl.addOverlay(layer, options.name);
                    }
                } else if (!this._options.externalControl) {
                    this._map.addLayer(layer);
                }
                this._map.setView(options.view || [-100, 100], 0);
                this.fire('load:tileslayer', {
                    layer: layer,
                    configuration: layerConfig
                });
            }
        },

        tUP: function() {
            if (!this._activeBaseLayer) return;
            if (!this._activeBaseLayer.options.customKeys) return;
            if (this._activeBaseLayer.options.t >= 0 && this._activeBaseLayer.options.customKeys.t) {
                let val = this._activeBaseLayer.options.customKeys.t;
                let cur = this._activeBaseLayer.options.t;
                let pos = val.findIndex((e) => {
                    return (`${e}` === cur);
                });
                let next = Math.min(pos + 1, val.length - 1);
                if (`${val[next]}` === cur) return;
                this._activeBaseLayer.options.t = `${val[next]}`;
                this._activeBaseLayer.setTooltipContent(`slice ${val[next]}`);
                this._activeBaseLayer.redraw();
            }
        },

        tDOWN: function() {
            if (!this._activeBaseLayer) return;
            if (!this._activeBaseLayer.options.customKeys) return;
            if (this._activeBaseLayer.options.t >= 0 && this._activeBaseLayer.options.customKeys.t) {
                let val = this._activeBaseLayer.options.customKeys.t;
                let cur = this._activeBaseLayer.options.t;
                let pos = val.findIndex((e) => {
                    return (`${e}` === cur);
                });
                let next = Math.max(pos - 1, 0);
                if (`${val[next]}` === cur) return;
                this._activeBaseLayer.options.t = `${val[next]}`;
                this._activeBaseLayer.setTooltipContent(`slice ${val[next]}`);
                this._activeBaseLayer.redraw();
            }
        }

    });

    L.mapBuilder = function(map, options, configuration) {
        return (new L.MapBuilder(map, options, configuration));
    }

}
