/**
 * @license AzimuthJS
 * (c) 2012-2013 Matt Priour
 * License: MIT
 */
(function (angular, OpenLayers, Leaflet) {
    "use strict";

    angular.module('az.directives').
        directive('azLayer', ['az.config', 'az.services.layers', '$parse', function (config, LayersService) {

            /**
             * Creates a shallow copy of an object minus the prototype and any functions. Useful when enumerating over objects
             * @param {Object} object the object to shallow copy
             * @params {Array} toOmit An array of properties to omit from the copied object
             * @returns {Object}
             */
            function shallowCopy(object, toOmit) {
                var copy = JSON.parse(JSON.stringify(object));
                if (angular.isArray(toOmit)) {
                    angular.forEach(toOmit, function (omitted) {
                        delete copy[omitted];
                    });
                }

                return copy;
            }

            /**
             * Determines whether or not the layer directive is nested underneath the map directive
             * @param {HTMLElement|Array} element
             * @param {String} mapSelector (A CSS3 query selector that matches either elements (e.g. ol-map) or attributes (e.g. [ol-map])
             * @returns {boolean}
             */
            function isLayerInMap(element, mapSelector) {
                return element.parent(mapSelector).length > 0;
            }

            return {
                restrict: 'EA',
                replace : true,
                html    : '',
                scope   : {},
                link    : function (scope, elem, attrs) {
                    var layerOptions = {},
                        layerType = attrs.lyrType,
                        layerURL = attrs.lyrUrl,
                        name = attrs.name,
                        layerWithinMap = isLayerInMap(elem, '*[ol-map], ol-map,*[leaflet-map], leaflet-map'),// TODO: Build this dynamically from values in the config
                        mappingLibrary = null;

                    angular.forEach(shallowCopy(attrs.$attr, ['lyrType', 'lyrUrl', 'lyrOptions', 'name']), function (value, key) {
                        if (!angular.isObject(value)) {
                            var pval;
                            try {
                                pval = scope.$eval(value);
                            } catch (e) {
                                pval = value;
                            }
                            //check for special case
                            //TODO may want a more generally applicable test
                            if (key === 'version' && isNaN(pval)) {
                                pval = value;
                            }
                            layerOptions[key] = pval;
                        }
                    });

                    layerOptions = angular.extend(layerOptions, scope.$eval(attrs.lyrOptions));

                    mappingLibrary = layerOptions.maplib || (!angular.isUndefined(OpenLayers) ? 'ol' : !angular.isUndefined(Leaflet) ? 'leaflet' : mappingLibrary);
                    LayersService[layerType][mappingLibrary](name, layerURL, layerOptions, layerWithinMap);
                }
            };


        }]);
})(window.angular, window.OpenLayers, window.L);