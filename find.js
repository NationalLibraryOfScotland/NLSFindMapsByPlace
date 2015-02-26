
	var map;
	var overlay; //current historic overlay node
	var baseLayers; // base layers include Google, Bing and OS maps, and OpenStreetMap
	var geographic = new OpenLayers.Projection("EPSG:4326");
	var mercator = new OpenLayers.Projection("EPSG:900913");
	var world = new OpenLayers.Bounds(-180, -89, 180, 89).transform(
	                geographic, mercator
	            );

// Do not display any warning for missing tiles

	OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
	OpenLayers.Tile.Image.useBlankTile=true;


	function getOverlay() {
	    var layers = map.layers.slice();
	    for (var x = 0; x < layers.length; x++) {
	        if (!layers[x].isBaseLayer && layers[x].displayInLayerSwitcher && layers[x].getVisibility()) return layers[x];
	    }
	}


	function forceRedraw() {
	    var mapDiv = document.getElementById('map');
	    /// FIX THE STUPID MICROSOFT IE:
	    if (document.documentElement && document.documentElement.clientWidth)
	            mapDiv.style.width = document.documentElement.clientWidth - 267;
	    if (document.documentElement && document.documentElement.clientHeight)
	            mapDiv.style.height = document.documentElement.clientHeight - 130;
	
	    if (map) {
	       map.zoomIn();
	       map.zoomOut(); 
	    }   
	}  

	function init() {
		// If there is a location hash value (which indicates the map location has been added to the URL), and the addLocationToURL element exists, change the 'Add location to URL' button to a 'Reset location' button
		if (window.location.hash != "" && document.getElementById('addLocationToURL')) {
			document.getElementById('addLocationToURL').innerHTML = "Reset map location";
			document.getElementById('addLocationToURL').href = "javascript:resetMapLocation();";
		}
		
	    forceRedraw(); // This must be called before the OpenLayers map is initialized

// Changes the base layer

	function mapBaseLayerChanged(e) {
	        // console.log(e.type + " " + e.layer.name);
	        if (e.layer.backgroundColor)
	        map.div.style.backgroundColor = e.layer.backgroundColor;
	        if (e.layer && document.getElementById('baseOption' + e.layer.name))
	        document.getElementById('baseOption' + e.layer.name).selected = true;
	        if (getOverlay()) forceRedraw();
	    }

// Changes the overlay layer from GeoServer

	function mapLayerChanged(e) {
	        // console.log(e.type + " " + e.layer.name + " " + e.property);
	        if (vectors) vectors.removeAllFeatures();
	        if (e.layer && document.getElementById('overlayRadio' + e.layer.name))
	        document.getElementById('overlayRadio' + e.layer.name).checked = true;
	        setResults();
	    }

// The main OpenLayers map elements

    map = new OpenLayers.Map('map', {
        div: document.getElementById("map"),
        controls: [
        new OpenLayers.Control.TouchNavigation({
                dragPanOptions: { enableKinetic: true }

            }),
        new OpenLayers.Control.Navigation({'zoomWheelEnabled': true}),
        new OpenLayers.Control.Zoom(),
        new OpenLayers.Control.ArgParser(),
        new OpenLayers.Control.Attribution()
        ],
        eventListeners: {
            "changelayer": mapLayerChanged,
            "changebaselayer": mapBaseLayerChanged
        },
        projection: "EPSG:900913",
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    });

// The scalebar on the map

    var scalebar = new OpenLayers.Control.ScaleLine({
                geodesic: true,
                div: document.getElementById("scalebar"),
                displaySystem: "english",
                maxWidth: 110,
                align: "right"
             });
          map.addControl(scalebar);

// The lat/lon of the mouse position 

    var mouseposition = new OpenLayers.Control.MousePosition();

// This code below converts the lat lon into a British National Grid Reference. With thanks from http://www.movable-type.co.uk/scripts/latlong-gridref.html NT261732

    function gridrefNumToLet(e, n, digits) {
        // get the 100km-grid indices
        var e100k = Math.floor(e / 100000),
        n100k = Math.floor(n / 100000);

        if (e100k < 0 || e100k > 6 || n100k < 0 || n100k > 12) return '';

        // translate those into numeric equivalents of the grid letters
        var l1 = (19 - n100k) - (19 - n100k) % 5 + Math.floor((e100k + 10) / 5);
        var l2 = (19 - n100k) * 5 % 25 + e100k % 5;

        // compensate for skipped 'I' and build grid letter-pairs
        if (l1 > 7) l1++;
        if (l2 > 7) l2++;
        var letPair = String.fromCharCode(l1 + 'A'.charCodeAt(0), l2 + 'A'.charCodeAt(0));

        // strip 100km-grid indices from easting & northing, and reduce precision
        e = Math.floor((e % 100000) / Math.pow(10, 5 - digits / 2));
        n = Math.floor((n % 100000) / Math.pow(10, 5 - digits / 2));

        Number.prototype.padLZ = function(w) {
            var n = this.toString();
            for (var i = 0; i < w - n.length; i++) n = '0' + n;
            return n;
        }

        var gridRef = letPair + e.padLZ(digits / 2) + n.padLZ(digits / 2);

        return gridRef;
    }

	function gridrefLetToNum(gridref) {
	  // get numeric values of letter references, mapping A->0, B->1, C->2, etc:
	  var l1 = gridref.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
	  var l2 = gridref.toUpperCase().charCodeAt(1) - 'A'.charCodeAt(0);
	  // shuffle down letters after 'I' since 'I' is not used in grid:
	  if (l1 > 7) l1--;
	  if (l2 > 7) l2--;

	  // convert grid letters into 100km-square indexes from false origin (grid square SV):
	  var e = ((l1-2)%5)*5 + (l2%5);
	  var n = (19-Math.floor(l1/5)*5) - Math.floor(l2/5);

	  // skip grid letters to get numeric part of ref, stripping any spaces:
	  gridref = gridref.slice(2).replace(/ /g,'');

	  // append numeric part of references to grid index:
	  e += gridref.slice(0, gridref.length/2);
	  n += gridref.slice(gridref.length/2);

	  // normalise to 1m grid, rounding up to centre of grid square:
	  switch (gridref.length) {
		case 2: e += '5000'; n += '5000'; break;
	    case 4: e += '500'; n += '500'; break;
	    case 6: e += '50'; n += '50'; break;
	    case 8: e += '5'; n += '5'; break;
	    // 10-digit refs are already 1m
	  }

	  return [e, n];
	}



    mouseposition.formatOutput = function(lonLat) {
        // Add Ordnance Survey coordinates
        var osgb = lonLat.clone();
        osgb.transform(map.displayProjection, new OpenLayers.Projection('EPSG:27700'));

	if ((lonLat.lon < -8.05) || (lonLat.lon > 2.2 ) || (lonLat.lat < 49.8) || (lonLat.lat > 61.6 )) {
	        var newHtml = this.prefix + 'Lon: '+ lonLat.lon.toFixed(5) + '<br/>Lat: ' + lonLat.lat.toFixed(5) +
	        this.suffix;
	        return newHtml; }
	else {

        var newHtml = this.prefix +
        '<b>' + gridrefNumToLet(osgb.lon, osgb.lat, 6) + '</b>' + '<br/>' +
        osgb.lon.toFixed(0) + this.separator + osgb.lat.toFixed(0) + '<br/>' +
        lonLat.lon.toFixed(5) + this.separator + lonLat.lat.toFixed(5) +
        this.suffix;
        return newHtml;
	}
    }
    map.addControl(mouseposition);

// Base map layers

    var osm = new OpenLayers.Layer.OSM( "Background map - OpenStreetMap");

//  Google layers

    var gmap = new OpenLayers.Layer.Google("Background map - Google Maps", {
        numZoomLevels: 20
        });
    var gsat = new OpenLayers.Layer.Google("Background map - Google Satellite", {
        type: google.maps.MapTypeId.SATELLITE,
        numZoomLevels: 22
    });
    var ghyb = new OpenLayers.Layer.Google("Background map - Google Hybrid", {
        type: google.maps.MapTypeId.HYBRID,
        numZoomLevels: 22
    });
    var gphy = new OpenLayers.Layer.Google("Background map - Google Terrain", {
        type: google.maps.MapTypeId.TERRAIN,
        numZoomLevels: 20
    });


// Add all base layers - the first is active by default 

    var baseLayers = [osm, gmap, gsat, ghyb, gphy];
    map.addLayers(baseLayers);

// Maintains overhead view rather than 45 degree view at high zoom levels

    ghyb.mapObject.setTilt(0);

// The layers from GeoServer - via GeoWebCache OSM/gmaps compatible access point:
// IT IS ESSENTIAL THAT YOU ALTER THESE BELOW TO RETRIEVE DIFFERENT LAYERS FROM YOUR OWN GEOSERVER APPLICATION
// One of the overlay layers should have visibility:true


    var catalog_1inch_1st_3rd = new OpenLayers.Layer.OSM("Scotland, OS One inch, 1856-1912",
	    "http://geoserver.nls.uk:8080/geoserver/gwc/service/gmaps?layers=nls:catalog_1inch_1st_3rd&zoom=${z}&x=${x}&y=${y}&format=image/png",
	    {
	        attribution: '', isBaseLayer: false, visibility: true,  tileOptions: {crossOriginKeyword: null}
	    });

    var catalog_6inch = new OpenLayers.Layer.OSM("Scotland, OS Six inch, 1843-1882",
	    "http://geoserver.nls.uk:8080/geoserver/gwc/service/gmaps?layers=nls:catalog_6inch&zoom=${z}&x=${x}&y=${y}&format=image/png",
	    {
	        attribution: '', isBaseLayer: false, visibility: false, tileOptions: {crossOriginKeyword: null}
	    });
 
    var catalog_1inch_newpop = new OpenLayers.Layer.OSM("England and Wales, OS One inch New Popular, 1945-47",
	    "http://geoserver.nls.uk:8080/geoserver/gwc/service/gmaps?layers=nls:new_pop_eng_wales&zoom=${z}&x=${x}&y=${y}&format=image/png",
	    {
	        attribution: '', isBaseLayer: false, visibility: false,   tileOptions: {crossOriginKeyword: null}
	    });

    var catalog_1inch_seventh = new OpenLayers.Layer.OSM("Great Britain, OS One inch 7th series, 1952-1961",
	    "http://geoserver.nls.uk:8080/geoserver/gwc/service/gmaps?layers=nls:catalog_one_inch_7th_series&zoom=${z}&x=${x}&y=${y}&format=image/png",
	    {
	        attribution: '', isBaseLayer: false, visibility: false, tileOptions: {crossOriginKeyword: null}
	    });

// The style of the vector layer for selected features

   var styleMapGreen = new OpenLayers.StyleMap(OpenLayers.Util.applyDefaults(
        {fillColor: "blue", fillOpacity: 0.01, strokeColor: "blue", strokeWidth: 3 },
        OpenLayers.Feature.Vector.style["default"]));


// The following is for GetFeature from GeoServer via WFS
// Layer with vectors - to show the selected feature

    var vectors = new OpenLayers.Layer.Vector("Vectors", {
        projection: map.projection,
        displayInLayerSwitcher: false,
        renderers: ["Canvas", "SVG", "VML"],
        styleMap: styleMapGreen
        });
    map.addLayers([vectors]);

// Click handler for the map

    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
                defaultHandlerOptions: {
                    'single': true,
                    'double': false,
                    'pixelTolerance': 0,
                    'stopSingle': false,
                    'stopDouble': false
                },

                initialize: function(options) {
                    this.handlerOptions = OpenLayers.Util.extend(
                        {}, this.defaultHandlerOptions
                    );
                    OpenLayers.Control.prototype.initialize.apply(
                        this, arguments
                    ); 
                    this.handler = new OpenLayers.Handler.Click(
                        this, {
                            'click': this.trigger
                        }, this.handlerOptions
                    );
                }, 

         trigger: function(e) {
        setResults("Loading...");
        var lonlat = map.getLonLatFromViewPortPx(e.xy);
        var lonlat4326 = lonlat.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"))
        var lonlat27700 = lonlat.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:27700"))
        var llxy = (lonlat.lon+' '+lonlat.lat); 

        var jsonp = new OpenLayers.Protocol.Script({
// IT IS ESSENTIAL THAT YOU ALTER THIS BELOW TO YOUR OWN GEOSERVER APPLICATION
            url: "http://geoserver.nls.uk:8080/geoserver/wfs",
            callbackKey: "format_options",
            callbackPrefix: "callback:",
            params: {
                request: "GetFeature",
                cql_filter: 'INTERSECTS(the_geom, POINT ('+llxy+'))',
                typeName: OpenLayers.Util.getParameters(getOverlay().url)['layers'],

                srsName: 'EPSG:900913',
                outputFormat: 'text/javascript'
            },
            
		
            callback: function(e) {
                var results = "";
                var fs = e.features;
                vectors.removeAllFeatures();
                vectors.addFeatures(fs);
                for (var x = 0; x < fs.length; x++) {

                    var p = fs[x].attributes;
                    results += '<p><a href="' + p.IMAGEURL + '" target="remotes"><img src="' + p.IMAGETHUMB + '" width="150" /><br />'  + p.SHEET + '</a><br />' + p.DATES + '</p>';

                }
                setResults(results);
            }
        });
        jsonp.read();
        map.raiseLayer(vectors, map.layers.length);
        // OpenLayers.Event.stop(e, true);
	}
    });

    var click = new OpenLayers.Control.Click();
    map.addControl(click);
    click.activate();

// Add all overlay layers

    map.addLayers([catalog_1inch_1st_3rd, catalog_1inch_newpop, catalog_6inch, catalog_1inch_seventh]);


// Initialize our layer + overlay switcher

    var layerSelect = document.getElementById('layerSelect');
    var overlaySelect = document.getElementById('overlaySelect');
    var layers = this.map.layers.slice();
    for (var x = 0; x < layers.length; x++) {
        if (!layers[x].displayInLayerSwitcher) continue;
        if (layers[x].isBaseLayer) {
            var option = document.createElement('option');
            option.appendChild(document.createTextNode(layers[x].name));
            option.setAttribute('value', x);
            option.setAttribute('id', 'baseOption' + layers[x].name);
            layerSelect.appendChild(option);
        } else {
            var option = document.createElement('div');
            var checked = (layers[x].getVisibility()) ? "checked" : "";
            option.innerHTML = '<input type="radio" name="overlay" id="overlayRadio'+ layers[x].name + '" value="' + x + '" onClick="switchOverlay(this.value)" ' + checked + '> ' + layers[x].name + '<br>';
            overlaySelect.appendChild(option);
        }
    }

// If we do not have a permalink set the default zoom and centre

    if (!map.getCenter()) {
        // Zoom map to extent of Scotland - coordintates must be trasformed from WGS84 to spherical mercator
        var proj = new OpenLayers.Projection("EPSG:4326");
        map.zoomToExtent(new OpenLayers.Bounds( -8.4, 50.5, 2.4, 59.8 ).transform(proj, map.getProjectionObject()));
    }


// Initialize the Gazetteer with autocomplete and County+Parish selector

	    nlsgaz(function(minx,miny,maxx,maxy){
	      // alert(minx + ' ' + miny + ' ' + maxx + ' ' + maxy);
	
	      // zoom to gridref
	      if (miny == null) {
	        var osgbnum = gridrefLetToNum(minx);
	        var osgb = new OpenLayers.LonLat(osgbnum[0], osgbnum[1]);
	        osgb.transform(new OpenLayers.Projection('EPSG:27700'), new OpenLayers.Projection("EPSG:4326"));
	        var osgb900913 = osgb.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"))
	        return map.setCenter(osgb900913, 6+minx.length);
	      }
	      // zoom to bbox
	      var proj = new OpenLayers.Projection("EPSG:4326");
	      map.zoomToExtent(new OpenLayers.Bounds( minx, miny, maxx, maxy ).transform(proj, map.getProjectionObject()));
	    });
	
	}

// Default entry in the left-hand results div - replaced by the WFS content from GeoServer on mouse click

	function setResults(str) {
	    if (!str) str = "<p id=\"noMapsSelected\">No maps selected - please click on a coloured rectangle on the map to the left that covers the area you are interested in</p>";
	    document.getElementById('results').innerHTML = str;
	}

// Alters the current overlay to a different overlay

	function switchOverlay(index) {
	    getOverlay().setVisibility(false);
	    map.layers[index].setVisibility(true);
	    forceRedraw();
	}
