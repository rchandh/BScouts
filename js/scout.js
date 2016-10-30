function loadMap(mapdata, topAmounts, topCusts) {
	var map;

	require([
	  "esri/config",
	  "esri/domUtils",
	  "esri/graphic",
	  "esri/InfoTemplate",
	  "esri/map",
	  "esri/request",
	  "esri/urlUtils",
	  "esri/dijit/InfoWindowLite",
	  "esri/geometry/Multipoint",
	  "esri/geometry/Point",
	  "esri/geometry/webMercatorUtils",
	  "esri/layers/ArcGISDynamicMapServiceLayer",
	  "esri/layers/ArcGISImageServiceLayer",
	  "esri/layers/FeatureLayer",
	  "esri/symbols/PictureMarkerSymbol",
	  "dojo/dom",
	  "dojo/dom-construct",
	  "dojo/json",
	  "dojo/on",
	  "dojo/parser",
	  "dojo/_base/array",
	  "dojo/_base/lang",
	  "dojox/data/CsvStore",
	  "dojox/encoding/base64",
	  "dijit/Dialog",
	  "dijit/layout/BorderContainer",
	  "dijit/layout/ContentPane",
	  "dojo/domReady!"
	],
	  function (
	    esriConfig, domUtils, Graphic, InfoTemplate, Map, request, urlUtils,
	    InfoWindowLite, Multipoint, Point, webMercatorUtils, ArcGISDynamicMapServiceLayer,
	    ArcGISImageServiceLayer, FeatureLayer, PictureMarkerSymbol, dom, domConstruct,
	    JSON, on, parser, arrayUtils, lang, CsvStore, base64
	) {

	    parser.parse();

	    //list of lat and lon field strings
	    var latFieldStrings = ["lat", "latitude", "y", "ycenter"];
	    var longFieldStrings = ["lon", "long", "longitude", "x", "xcenter"];

	    map = new Map("mapCanvas", {
	      basemap: "topo",
	      center: [36.2, -86.5],
	      zoom: 5,
	      slider: true
	    });

	    map.infoWindow.resize(275, 175);

      var mapCanvas = dom.byId("mapCanvas");

	    function processCSVData (data) {
	      var newLineIndex = data.indexOf("\n");
	      var firstLine = lang.trim(data.substr(0, newLineIndex)); //remove extra whitespace, not sure if I need to do this since I threw out space delimiters
	      var separator = getSeparator(firstLine);
	      var csvStore = new CsvStore({
	        data: data,
	        separator: separator
	      });

	      csvStore.fetch({
	        onComplete: function (items) {
	          var objectId = 0;
	          var featureCollection = generateFeatureCollectionTemplateCSV(csvStore, items);
	          var popupInfo = generateDefaultPopupInfo(featureCollection);
	          var infoTemplate = new InfoTemplate(buildInfoTemplate(popupInfo));
	          var latField, longField;
	          var fieldNames = csvStore.getAttributes(items[0]);
	          arrayUtils.forEach(fieldNames, function (fieldName) {
	            var matchId;
	            matchId = arrayUtils.indexOf(latFieldStrings,
	              fieldName.toLowerCase());
	            if (matchId !== -1) {
	              latField = fieldName;
	            }

	            matchId = arrayUtils.indexOf(longFieldStrings,
	              fieldName.toLowerCase());
	            if (matchId !== -1) {
	              longField = fieldName;
	            }
	          });

	          // Add records in this CSV store as graphics
	          arrayUtils.forEach(items, function (item) {
	            var attrs = csvStore.getAttributes(item),
	              attributes = {};;
	            // Read all the attributes for  this record/item
	            arrayUtils.forEach(attrs, function (attr) {
	              var value = Number(csvStore.getValue(item, attr));
	              attributes[attr] = isNaN(value) ? csvStore.getValue(item, attr) : value;
	            });

	            attributes["__OBJECTID"] = objectId;
	            objectId++;

	            var latitude = parseFloat(attributes[latField]);
	            var longitude = parseFloat(attributes[longField]);

	            if (isNaN(latitude) || isNaN(longitude)) {
	              return;
	            }

	            var geometry = webMercatorUtils
	              .geographicToWebMercator(new Point(longitude, latitude));
	            var feature = {
	              "geometry": geometry.toJson(),
	              "attributes": attributes
	            };
	            featureCollection.featureSet.features.push(feature);
	          });

	          var featureLayer = new FeatureLayer(featureCollection, {
	            infoTemplate: infoTemplate,
	            id: 'csvLayer'
	          });
	          featureLayer.__popupInfo = popupInfo;
	          map.addLayer(featureLayer);
	          zoomToData(featureLayer);
	        },
	        onError: function (error) {
	          console.error("Error fetching items from CSV store: ", error);
	        }
	      });
	    }

	    function generateFeatureCollectionTemplateCSV (store, items) {
	      //create a feature collection for the input csv file
	      var featureCollection = {
	        "layerDefinition": null,
	        "featureSet": {
	          "features": [],
	          "geometryType": "esriGeometryPoint"
	        }
	      };
	      featureCollection.layerDefinition = {
	        "geometryType": "esriGeometryPoint",
	        "objectIdField": "__OBJECTID",
	        "type": "Feature Layer",
	        "typeIdField": "",
	        "drawingInfo": {
	          "renderer": {
	            "type": "simple",
	            "symbol": {
	              "type": "esriPMS",
	              "url": "https://static.arcgis.com/images/Symbols/Basic/RedSphere.png",
	              "imageData": "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",
	              "contentType": "image/png",
	              "width": 25,
	              "height": 25
	            }
	          }
	        },
	        "fields": [
	          {
	            "name": "__OBJECTID",
	            "alias": "__OBJECTID",
	            "type": "esriFieldTypeOID",
	            "editable": false,
	            "domain": null
	          }
	        ],
	        "types": [],
	        "capabilities": "Query"
	      };
	      var fields = store.getAttributes(items[0]);
	      arrayUtils.forEach(fields, function (field) {
	        var value = store.getValue(items[0], field);
	        var parsedValue = Number(value);
	        if (isNaN(parsedValue)) { //check first value and see if it is a number
	          featureCollection.layerDefinition.fields.push({
	            "name": field,
	            "alias": field,
	            "type": "esriFieldTypeString",
	            "editable": true,
	            "domain": null
	          });
	        }
	        else {
	          featureCollection.layerDefinition.fields.push({
	            "name": field,
	            "alias": field,
	            "type": "esriFieldTypeDouble",
	            "editable": true,
	            "domain": null
	          });
	        }
	      });
	      return featureCollection;
	    }

	    function generateDefaultPopupInfo (featureCollection) {
	      var fields = featureCollection.layerDefinition.fields;
	      var decimal = {
	        'esriFieldTypeDouble': 1,
	        'esriFieldTypeSingle': 1
	      };
	      var integer = {
	        'esriFieldTypeInteger': 1,
	        'esriFieldTypeSmallInteger': 1
	      };
	      var dt = {
	        'esriFieldTypeDate': 1
	      };
	      var displayField = null;
	      var fieldInfos = arrayUtils.map(fields,
	        lang.hitch(this, function (item) {
	          if (item.name.toUpperCase() === "NAME") {
	            displayField = item.name;
	          }
	          var visible = (item.type !== "esriFieldTypeOID" &&
	                         item.type !== "esriFieldTypeGlobalID" &&
	                         item.type !== "esriFieldTypeGeometry");
	          var format = null;
	          if (visible) {
	            var f = item.name.toLowerCase();
	            var hideFieldsStr = ",stretched value,fnode_,tnode_,lpoly_,rpoly_,poly_,subclass,subclass_,rings_ok,rings_nok,";
	            if (hideFieldsStr.indexOf("," + f + ",") > -1 ||
	                f.indexOf("area") > -1 || f.indexOf("length") > -1 ||
	                f.indexOf("shape") > -1 || f.indexOf("perimeter") > -1 ||
	                f.indexOf("objectid") > -1 || f.indexOf("_") == f.length - 1 ||
	                f.indexOf("_i") == f.length - 2) {
	              visible = false;
	            }
	            if (item.type in integer) {
	              format = {
	                places: 0,
	                digitSeparator: true
	              };
	            }
	            else if (item.type in decimal) {
	              format = {
	                places: 2,
	                digitSeparator: true
	              };
	            }
	            else if (item.type in dt) {
	              format = {
	                dateFormat: 'shortDateShortTime'
	              };
	            }
	          }

	          return lang.mixin({}, {
	            fieldName: item.name,
	            label: item.alias,
	            isEditable: false,
	            tooltip: "",
	            visible: visible,
	            format: format,
	            stringFieldOption: 'textbox'
	          });
	        }));

	      var popupInfo = {
	        title: displayField ? '{' + displayField + '}' : '',
	        fieldInfos: fieldInfos,
	        description: null,
	        showAttachments: false,
	        mediaInfos: []
	      };
	      return popupInfo;
	    }

	    function buildInfoTemplate (popupInfo) {
	      var json = {
	        content: "<table>"
	      };

	      arrayUtils.forEach(popupInfo.fieldInfos, function (field) {
	        if (field.visible) {
	          json.content += "<tr><td valign='top'>" + field.label +
	                          ": <\/td><td valign='top'>${" + field.fieldName + "}<\/td><\/tr>";
	        }
	      });
	      json.content += "<\/table>";
	      return json;
	    }

	    function clearAll () {
	      map.graphics.clear();
	      var layerIds = map.graphicsLayerIds.slice(0);
	      layerIds = layerIds.concat(map.layerIds.slice(1));

	      arrayUtils.forEach(layerIds, function (layerId) {
	        map.removeLayer(map.getLayer(layerId));
	      });
	    }

	    function getSeparator (string) {
	      var separators = [",", "      ", ";", "|"];
	      var maxSeparatorLength = 0;
	      var maxSeparatorValue = "";
	      arrayUtils.forEach(separators, function (separator) {
	        var length = string.split(separator).length;
	        if (length > maxSeparatorLength) {
	          maxSeparatorLength = length;
	          maxSeparatorValue = separator;
	        }
	      });
	      return maxSeparatorValue;
	    }

	    function zoomToData (featureLayer) {
	      // Zoom to the collective extent of the data
	      var multipoint = new Multipoint(map.spatialReference);
	      arrayUtils.forEach(featureLayer.graphics, function (graphic) {
	        var geometry = graphic.geometry;
	        if (geometry) {
	          multipoint.addPoint({
	            x: geometry.x,
	            y: geometry.y
	          });
	        }
	      });

	      if (multipoint.points.length > 0) {
	        map.setExtent(multipoint.getExtent().expand(1.25), true);
	      }
	    }

			mapdata += "0,-1.01,-1.02,0,0";
			processCSVData(mapdata);
			$("#loadingDiv").hide();
			drawChart('revenuepiechart', topAmounts, 'Revenue Generated');
	    drawChart('crowdpiechart', topCusts, 'Population Density');
	  }
	);
}

function scout(){
	merchantId = $("#search").val();
	getMerchantDetails(function() {
		window.location.href = "./scout.html?merchant=" + merchantId;
	}, function() {
		alert("Merchant ID not recognized. Re-enter the merchant ID")
	});
}

function drawChart(divid, data, title) {
		var data = google.visualization.arrayToDataTable(data);

		var options = {
			title: title,
			backgroundColor : 'black',
			colors: ['#037a21', '#189b39', '#7ed38b', '#5cb272'],
			titleTextStyle: { color: 'white' },
			legend: {
        textStyle: { color: 'white' }
    	}
		};

		var chart = new google.visualization.PieChart(document.getElementById(divid));

		chart.draw(data, options);
}
