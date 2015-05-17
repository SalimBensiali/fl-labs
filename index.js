if (!token)
    alert("you need an xServer internet token to run this sample!");

var hour = 0;
var enableSpeedPatterns = true;
var enableRestrictionZones = true;
var enableTrafficIncidents = true;
var enableTruckAttributes = true;
var itineraryLanguage = 'EN';
var routingProfile = 'truckfast';
var alternativeRoutes = 0;
var replaySpeed = 250;
var responses = null;

var map = L.map('map', {
    zoomControl: false,
    contextmenu: true,
    contextmenuWidth: 200,
    contextmenuItems: [{
        text: 'Add Waypoint At Start',
        callback: function (ev) {
            if (routingControl._plan._waypoints[0].latLng)
                routingControl.spliceWaypoints(0, 0, ev.latlng);
            else
                routingControl.spliceWaypoints(0, 1, ev.latlng);
        }
    }, {
        text: 'Add Waypoint At End',
        callback: function (ev) {
            if (routingControl._plan._waypoints[routingControl._plan._waypoints.length - 1].latLng)
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length, 0, ev.latlng);
            else
                routingControl.spliceWaypoints(routingControl._plan._waypoints.length - 1, 1, ev.latlng);
        }
    }]
});


var attribution = '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM';
var cluster = 'eu-n-test';

// create a separate pane for the xmap labels, so they are displayed on top of the route line
// http://bl.ocks.org/rsudekum/5431771
map._panes.labelPane = map._createPane('leaflet-top-pane', map.getPanes().shadowPane);

map.setView([0,0], 0);

var replay = function () {
    replaySpeed = $('#replaySpeed option:selected').val();
    buildD3Animations(responses, replaySpeed);
}

var getLayers = function (profile) {
    //add tile layer
    var bgLayer = new L.PtvLayer.FeatureLayerBg("https://xmap-eu-n-test.cloud.ptvgroup.com", {
        token: token,
        attribution: attribution,
        profile: profile + "-bg",
        beforeSend2: function (request) {
            if (hour)
                request.mapParams.referenceTime = moment.utc().add(hour, 'hours').format();
        }
    });

    //add fg layer
    var fgLayer = new L.PtvLayer.FeatureLayerFg("https://xmap-eu-n-test.cloud.ptvgroup.com", {
        token: token,
        attribution: attribution,
        profile: profile + "-fg",
        pane: map._panes.labelPane,
        beforeSend2: function (request) {
            if (hour)
                request.mapParams.referenceTime = moment.utc().add(hour, 'hour').format()
        }
    });

    return L.layerGroup([bgLayer, fgLayer]);
}

var incidents = new L.PtvLayer.FeatureLayer({ name: 'PTV_TrafficIncidents' }).addTo(map);
var truckAttributes = new L.PtvLayer.FeatureLayer({ name: 'PTV_TruckAttributes' }).addTo(map);
var restrictionZones = new L.PtvLayer.FeatureLayer({ name: 'PTV_RestrictionZones' }).addTo(map);
var speedPatterns = new L.PtvLayer.FeatureLayer({ name: 'PTV_SpeedPatterns' }).addTo(map);
//var preferredRoutes = new L.PtvLayer.FeatureLayer({ name: 'PTV_PreferredRoutes' }).addTo(map);

var baseLayers = {
    "PTV classic": getLayers("ajax"),
    "PTV sandbox": getLayers("sandbox"),
    "PTV silkysand": getLayers("silkysand"),
    "PTV gravelpit": getLayers("gravelpit").addTo(map)
};

L.control.layers(baseLayers, {
    "Incidents": incidents,
    "Truck Attributes": truckAttributes,
    "Restriction Zones": restrictionZones,
    "Speed Patterns": speedPatterns
}, { position: 'topleft' }).addTo(map);

new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);

$('#range').attr("value", hour);
$('#enableSpeedPatterns').attr("checked", enableSpeedPatterns);
$('#enableRestrictionZones').attr("checked", enableRestrictionZones);
$('#enableTrafficIncidents').attr("checked", enableTrafficIncidents);
$('#enableTruckAttributes').attr("checked", enableTruckAttributes);
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#alternativeRoutes').val(alternativeRoutes);
$('#replaySpeed').val(replaySpeed);

var sidebar = L.control.sidebar('sidebar').addTo(map);
sidebar.open("home");
 
fixClickPropagationForIE(sidebar._sidebar);

var buildProfile = function () {
    var template = '<Profile xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><FeatureLayer majorVersion=\"1\" minorVersion=\"0\"><GlobalSettings enableTimeDependency=\"true\"/><Themes><Theme id=\"PTV_RestrictionZones\" enabled=\"{enableRestrictionZones}\" priorityLevel=\"0\"></Theme><Theme id=\"PTV_SpeedPatterns\" enabled=\"{enableSpeedPatterns}\" priorityLevel=\"0\"/><Theme id=\"PTV_TrafficIncidents\" enabled=\"{enableTrafficIncidents}\" priorityLevel=\"0\"/><Theme id=\"PTV_TruckAttributes\" enabled=\"{enableTruckAttributes}\" priorityLevel=\"0\"/><Theme id=\"PTV_TimeZones\" enabled=\"true\" priorityLevel=\"0\"/></Themes></FeatureLayer><Routing majorVersion=\"2\" minorVersion=\"0\"><Course><AdditionalDataRules enabled=\"true\"/></Course></Routing></Profile>'

    template = template.replace("{enableRestrictionZones}", enableRestrictionZones);
    template = template.replace("{enableSpeedPatterns}", enableSpeedPatterns);
    template = template.replace("{enableTruckAttributes}", enableTruckAttributes);
    template = template.replace("{enableTrafficIncidents}", enableTrafficIncidents);

    return template;
}

var setNow = function () {
    $('#range').val(0);
    updateParams(true);
}

var updateParams = function (refreshFeatureLayer) {
    hour = $('#range').val();
    enableSpeedPatterns = $('#enableSpeedPatterns').is(':checked');
    enableRestrictionZones = $('#enableRestrictionZones').is(':checked');
    enableTruckAttributes = $('#enableTruckAttributes').is(':checked');
    enableTrafficIncidents = $('#enableTrafficIncidents').is(':checked');
    itineraryLanguage = $('#languageSelect option:selected').val();
    routingProfile = $('#routingProfile option:selected').val();
    alternativeRoutes = $('#alternativeRoutes option:selected').val();

    if (refreshFeatureLayer) {
        speedPatterns.redraw();
        //        incidents.redraw();
    }

    routingControl._router.options.numberOfAlternatives = alternativeRoutes;
    routingControl.route();
}


var routingControl = L.Routing.control({
    plan: L.Routing.plan([
		L.latLng(48.813194201165274, 9.2841339111328125),
		L.latLng(48.694133170886325, 9.122772216796875)
    ], {
        createMarker: function (i, wp) {
            return L.marker(wp.latLng, {
                draggable: true,
                icon: new L.Icon.Label.Default({ labelText: String.fromCharCode(65 + i) })
            });
        },
        geocoder: L.Control.Geocoder.ptv({ token: token })
    }),
    lineOptions: {
        styles: [
          // Shadow
          { color: 'black', opacity: 0.4, weight: 12 },
          // Outline
          { color: 'blue', opacity: 0.8, weight: 8 },
          // Center
          { color: 'lightblue', opacity: 1, weight: 4 }
        ]
    },
    router: L.Routing.ptv({
        serviceUrl: 'https://xroute-' + cluster + '.cloud.ptvgroup.com/xroute/rs/XRoute/',
        token: token,
        numberOfAlternatives: alternativeRoutes,
        beforeSend: function (request) {
            if (hour)
                request.options.push({
                    parameter: "START_TIME",
                    value: moment.utc().add(hour, 'hours').format()
                });

            request.options.push({
                parameter: "ROUTE_LANGUAGE",
                value: itineraryLanguage
            });

            request.callerContext.properties.push({
                key: "ProfileXMLSnippet",
                value: buildProfile()
            });

            request.callerContext.properties.push({ key: "Profile", value: routingProfile });

            return request;
        },
        routesCalculated: function (r) {
            responses = r;
            replay();
        }
    }),
    routeWhileDragging: false,
    routeDragInterval: 1000
}).addTo(map);

routingControl.on('routingerror', function (e) {
    alert(e.error.responseJSON.errorMessage);
});
