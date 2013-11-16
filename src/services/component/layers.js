/**
 * @license AzimuthJS
 * (c) 2012-2013 Matt Priour
 * License: MIT
 */
(function (angular, OpenLayers, Leaflet) {
    "use strict";

    angular.module('az.services').
        factory('az.services.layers', ['az.config', '$http','$rootScope', function (config, $http, $scope) {
            var defaults = config.defaults;

            function capitalize(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);

            }

            /**
             * Constructs a new instance of the OpenLayers Vector object
             * @param {String} name
             * @param {String} url
             * @param {Object} opts
             * @param {Boolean} isInMap
             * @returns {OpenLayers.Layer.Vector}
             * @constructor
             */
            function constructOpenLayersGeoJSON(name, url, opts, isInMap) {
                var lyrOptKeys = ['style', 'styleMap', 'filter', 'projection'],
                    lyrOpt = {'mapLayer': isInMap};

                angular.forEach(lyrOptKeys, function (value) {
                    if (value in opts) {
                        lyrOpt[value] = opts[value];
                        delete opts[value];
                    }
                });

                var layer = new OpenLayers.Layer.Vector(name, angular.extend(
                    {
                        protocol  : new OpenLayers.Protocol.HTTP(
                            angular.extend(
                                {
                                    'url' : url,
                                    format: new OpenLayers.Format.GeoJSON()
                                }, opts
                            )
                        ),
                        strategies: [opts.strategy || new OpenLayers.Strategy.Fixed()]
                    }, lyrOpt)
                );

                LayersService.layers.push(layer);

                return layer;
            }

            function constructMarkerLayer(name, url, opts, isInMap) {
                var layer = new OpenLayers.Layer.Markers(capitalize(name)),
                    size = new OpenLayers.Size(defaults.MARKER.DIMS.W, defaults.MARKER.DIMS.H),
                    offset = new OpenLayers.Pixel(-(size.w / 2), -size.h),
                    icon = new OpenLayers.Icon(defaults.MARKER.ICON, size, offset),
                    latLon = new OpenLayers.LonLat(opts.longitude, opts.latitude).transform(defaults.SRS, 'EPSG:3857');

                layer.mapLayer = isInMap;
                layer.addMarker(new OpenLayers.Marker(latLon, icon));
                LayersService.layers.push(layer);
                LayersService.trigger('layers:new', layer);
                return layer;
            }

            /**
             * Constructs and returns a new instance of the Leaflet GeoJSON layer
             * @param {?String} name
             * @param {!String} url
             * @param {!Object} opts
             * @param {!Boolean} isInMap
             * @returns {*}
             * @constructor
             */
            function constructLeafletGeoJSON(name, url, opts, isInMap) {
                var lyrOptKeys = ['pointToLayer', 'style', 'filter', 'onEachFeature'],
                    lyrOpt = {'mapLayer': isInMap, name: opts.name || 'Vector'};

                angular.forEach(lyrOptKeys, function (value) {
                    if (value in opts) {
                        lyrOpt[value] = opts[value];
                        delete opts[value];
                    }
                });


                var layer = Leaflet.geoJson(null, lyrOpt);

                $http({
                    method: 'GET',
                    url   : url,
                    params: opts.params
                }).success(function (data) {
                        layer.addData(data);
                    });

                LayersService.layers.unshift(layer);
                return layer;
            }

            /**
             * Constructs a new instance of an OpenLayers WMS Layer
             * @param {!String} name
             * @param {!String} url
             * @param {Object} opts
             * @param {!Boolean} isInMap
             * @returns {OpenLayers.Layer.WMS}
             * @constructor
             */
            function constructOpenLayersWMS(name, url, opts, isInMap) {
                var paramKeys = ['styles', 'layers', 'version', 'format', 'exceptions', 'transparent', 'crs'],
                    params = {mapLayer: isInMap};


                angular.forEach(paramKeys, function (value) {
                    if (value in opts) {
                        params[value] = opts[value];
                        delete opts[value];
                    }
                });

                var layer = new OpenLayers.Layer.WMS(name, url, params, opts);
                LayersService.layers.push(layer);
                return layer;
            }

            /**
             * Constructs and returns a new instance of a Leaflet Web Mapping Service
             * @param {?String} name
             * @param {!String} url
             * @param {Object} opts
             * @param {Boolean} isInMap
             * @returns {*|Emitter|Promise|Object}
             * @constructor
             */
            function constructLeafletWMS(name, url, opts, isInMap) {
                url = url.replace(/\${/g, '{');
                if (opts.transparent && (!opts.format || opts.format.indexOf('jpg') > -1)) {
                    opts.format = 'image/png';
                }
                var layer = Leaflet.tileLayer.wms(url, angular.extend({
                        mapLayer: isInMap
                    }, opts)).on('loading', function (e) {
                        var lyr = e.target, projKey = lyr.wmsParams.version >= '1.3' ? 'crs' : 'srs';
                        if (opts[projKey] !== lyr.wmsParams[projKey]) {
                            //if someone went to the trouble to set it, let them keep it that way.
                            //lots of WMS servers only accept certain crs codes which are aliases
                            //for the ones defined in Leaflet. ie reject EPSG:3857 but accept EPSG:102113
                            lyr.wmsParams[projKey] = opts[projKey];
                        }
                    });

                LayersService.layers.unshift(layer);
                return layer;
            }

            /**
             * Constructs and returns a new instance of an OpenLayers Tile Layer
             * @param {!String} name
             * @param {!String} url
             * @param {Object} opts
             * @param {!Boolean} isInMap
             * @returns {OpenLayers.Layers.XYZ}
             * @constructor
             */
            function constructOpenLayerTiles(name, url, opts, isInMap) {
                var subdomains = !!opts.subdomains ? opts.subdomains : defaults.SUBDOMAINS,
                    urls = [],
                    tilesUrl = url || defaults.TILE_URL,
                    splitUrl = tilesUrl.split('${s}');


                if (subdomains && splitUrl.length > 1) {
                    delete opts.subdomains;
                    angular.forEach(subdomains, function (value, index) {
                        urls[index] =
                            OpenLayers.String.format(splitUrl[0] + '${s}', angular.extend(opts, {s: value})) + splitUrl[1];
                    });
                } else {
                    urls = [tilesUrl];
                }

                var layer = new OpenLayers.Layer.XYZ(name, urls, angular.extend({
                    projection      : 'EPSG:' + defaults.CRS,
                    transitionEffect: 'resize',
                    wrapDateLine    : true
                }, opts));

                layer.mapLayer = isInMap;
                LayersService.layers.push(layer);
                return layer;
            }

            /**
             * Returns a new instance of the Leaflet Tile Layer
             * @param {?String} name
             * @param {!String} url
             * @param {Object} opts
             * @param {!Boolean} isInMap
             * @returns {*}
             * @constructor
             */
            function constructLeafletTiles(name, url, opts, isInMap) {
                var subdomains = opts.subdomains !== false && (opts.subdomains || defaults.SUBDOMAINS),
                    tilesUrl = url || defaults.TILE_URL;

                tilesUrl = tilesUrl.replace(/\${/g, '{');

                var layer = Leaflet.tileLayer(tilesUrl, angular.extend({
                    mapLayer    : isInMap,
                    'subdomains': subdomains
                }, opts));

                LayersService.layers.unshift(layer);
                return layer;
            }

            var LayersService = {
                layers      : [],
                events : {},
                getMapLayers: function () {
                    var layers = [];
                    angular.forEach(this.layers, function (layer) {
                        if (!!layer.mapLayer) {
                            layers.push(layer);
                        }
                    });
                    return layers;
                },
                on: function(event, callback){
                    if(!angular.isArray(this.events[event])){
                        this.events[event] = [];
                    }
                    this.events[event].push(callback);
                },
                once: function(eventName, callback){
                    var self = this;
                    this.on(eventName, function(){
                        var args = Array.prototype.slice.call(arguments);
                        callback.apply(callback, args);
                        var handler = self.events[eventName].indexOf(this);
                        delete self.events[eventName][handler];
                    });
                },
                trigger: function(eventName){
                    var args = Array.prototype.slice.call(arguments, 1),
                        handlers = this.events[eventName] || [];

                    for (var i = 0; i < handlers.length; i++) {
                        handlers[i].apply(handlers[i], args);
                    }
                },
                reset: function reset(){
                  this.layers.length = 0;
                  this.events = {};
                },
                tiles       : {
                    'ol'     : constructOpenLayerTiles,
                    'leaflet': constructLeafletTiles
                },
                marker      : {
                    'ol': constructMarkerLayer
                },
                wms         : {
                    'ol'     : constructOpenLayersWMS,
                    'leaflet': constructLeafletWMS
                },
                geojson     : {
                    'ol'     : constructOpenLayersGeoJSON,
                    'leaflet': constructLeafletGeoJSON
                }
            };

            return LayersService;
        }]);

})(window.angular, window.OpenLayers, window.L);
