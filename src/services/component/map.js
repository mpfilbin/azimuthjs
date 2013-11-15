/**
 * @license AzimuthJS
 * (c) 2012-2013 Matt Priour
 * License: MIT
 */
(function (angular, OpenLayers) {
    "use strict";

    angular.module('az.services').
        service('az.services.map', ['az.config', '$parse', 'az.services.layers', function (config, $parse, LayersService) {
            var defaults = config.defaults,
                mapEventPattern = /^map/i;

            function shallowClone(object, toOmit) {
                var copy = JSON.parse(JSON.stringify(object));
                if (angular.isArray(toOmit)) {
                    while (toOmit.length) {
                        delete copy[toOmit.pop()];
                    }
                }
                return copy;
            }

            /**
             * provides a default implementation for Array.map when there is no native implementation
             * @param {!Array} collection
             * @param {!Function} callback
             * @returns {Array}
             */
            function map(collection, callback) {
                var mappedResults;
                if (angular.isFunction(Array.prototype.map)) {
                    mappedResults = collection.map(callback);
                } else {
                    mappedResults = [];
                    for (var i = 0; i < collection.length; i++) {
                        mappedResults.push(callback(collection[i]));

                    }
                }
                return mappedResults;
            }

            /**
             * Builds a new Azimuth Map object
             * @param {!HTMLElement} DOMElement
             * @param {!Array} layers
             * @param {Object} mapOptions
             * @returns {Map}
             * @constructor
             */
            function Map(DOMElement, layers, mapOptions) {
                this.map = new OpenLayers.Map(DOMElement, {
                    'projection'       : buildProjection(mapOptions.mapProjection),
                    'displayProjection': buildProjection(mapOptions.displayProjection),
                    'controls'         : parseControls(mapOptions.controls, mapOptions.controlsOpts),
                    'center'           : buildLatLon(mapOptions.center, 'EPSG:4326', mapOptions.mapProjection),
                    'zoom'             : mapOptions.zoom,
                    'layers'           : layers
                });

                return this;
            }

            /**
             * Destroys the OpenLayers Map instance and removes any associated layers
             */
            Map.prototype.destroy = function destroy() {
                this.map.destroy();
                LayersService.emptyLayers();
                delete this.map;
            };

            /**
             * Registers an event handler for a given event on the map;
             * @param {!String} eventName The name of a support OpenLayers.Events (e.g. addlayer, mouseout, etc.)
             * @param {!Function} handler The handler to invoke when the event occurs
             */
            Map.prototype.registerEventListener = function registerEventListener(eventName, handler) {
                this.map.events.register(eventName, this.map, (handler || angular.noop));
            };


            /**
             * Capitalizes the first character of a string
             * @param {!String} string
             * @returns {string}
             */
            function capitalize(string) {
                return (string.charAt(0).toUpperCase() + string.slice(1));
            }

            /**
             * Constructs and returns a new OpenLayers Projection
             * @param {!String} identified - The projection's 'Well Known Identifier' (e.g. EPSG:2784)
             * @param {?Object} options
             * @returns {OpenLayers.Projection}
             */
            function buildProjection(identified, options) {
                return new OpenLayers.Projection(identified, options);
            }

            /**
             * Constructs and returns a collection of OpenLayer.Control object
             * @param {Array}controls
             * @param {Object} opts
             * @returns {Array|*}
             */
            function parseControls(controls, opts) {
                return map(controls, function (control) {
                    return buildControls(capitalize(control), (opts || {})[control]);
                });
            }

            /**
             * Constructs a new OpenLayers Map Control and returns it
             * @param {!String} controlName
             * @param {!Object} controlOpts
             * @returns {*}
             */
            function buildControls(controlName, controlOpts) {
                return new OpenLayers.Control[controlName](controlOpts);
            }

            /**
             *
             * @param {!Array} coordinates
             * @param {!String | !OpenLayers.Project} sourceProject
             * @param {!String | !OpenLayers.Project} destProject
             * @returns {OpenLayers.LonLat}
             */
            function buildLatLon(coordinates, sourceProject, destProject) {
                var latLon = new OpenLayers.LonLat(coordinates);
                if (sourceProject && destProject) {
                    latLon.transform(sourceProject, destProject);
                }
                return latLon;
            }

            return {
                constructMap: function constructMap(elem, attributes) {
                    var mapOptions = {
                        center           : attributes.center ? attributes.center.split(',') : defaults.CENTER.split(',').reverse(),
                        zoom             : attributes.zoom || defaults.ZOOM,
                        mapProjection    : attributes.projection || attributes.proj || attributes.crs || ('EPSG:' + defaults.CRS),
                        displayProjection: attributes.dispProjection || attributes.dispProj || ('EPSG:' + defaults.DISP_CRS),
                        controls         : (attributes.controls || defaults.OL_CONTROLS).split(','),
                        controlOpts      : angular.extend(defaults.OL_CTRL_OPTS, $parse(attributes.controlOpts)())
                    };

                    var layers = LayersService.getMapLayers();
                    return new Map(elem[0], layers, mapOptions);
                },
                parseEvents : function parseEvents(attributes) {
                        var events = [];

                    angular.forEach(attributes, function (value, attribute) {
                        if (mapEventPattern.test(attribute)) {
                            events.push({
                                name   : attribute.replace(mapEventPattern, '').toLowerCase(),
                                handler: $parse(value)
                            });
                        }
                    });
                    return events;
                }
            };
        }]);


})(window.angular, window.OpenLayers);