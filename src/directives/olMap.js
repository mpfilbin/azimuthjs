/**
 * @license AzimuthJS
 * (c) 2012-2013 Matt Priour
 * License: MIT
 */
(function (angular, OpenLayers) {
    "use strict";
    angular.module('az.directives').
        directive('olMap', ['az.config', 'az.services.map', '$parse',
            function (config, MapService, $parse) {

                function elementEventHandler(scope, handler, event) {
                    handler(scope, event);
                }

                function mapEventHandler(scope, elem, $event, eventObject) {
                    eventObject.evtType = eventObject.type;
                    delete eventObject.type;
                    elem.trigger($event.key, eventObject);
                    //We create an $apply if it isn't happening.
                    //copied from angular-ui uiMap class
                    if (!scope.$$phase) {
                        scope.$apply();
                    }
                }

                return {
                    restrict: 'EA',
                    priority: -10,
                    link    : function (scope, elem, attrs) {
                        var map = MapService.constructMap(elem, attrs),
                            events = MapService.parseEvents(attrs);

                        angular.forEach(events, function (event) {

                            map.registerEventListener(
                                event.name,
                                angular.bind(map.map, mapEventHandler, scope, elem, {key: event.name})
                            );

                            elem.bind(event.name, function (evnt) {
                                event.handler(scope, evnt);
                            });
                        });

                        scope.$on('$destroy', function (event) {
                            map.destroy();
                        });

                        var model = $parse(attrs.olMap);
                        if (model) {
                            model.assign(scope, map);
                        }
                    }
                };
            }]);
})(window.angular, window.OpenLayers);
