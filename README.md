NLSFindMapsByPlace
==================

This demonstration application uses <a href="http://dev.openlayers.org/releases/OpenLayers-2.13.1/">OpenLayers 2.13</a> and <a href="http://geoserver.org/">GeoServer</a> to form a geographical retrieval inteface for historical maps. Searching is possible by zooming in on the map, with an option to change the map base layer between OpenStreetMap and Google layers. Searching is also possible by using a Google gazetteer (using the Google Maps API v3), a British National Grid Reference, as well as historic county and parish drop-down lists. 

The boundaries of historic maps are held as shapefiles within GeoServer, pre-rendered using GeoWebCache and customised for display using GeoServer Styled Layer Descriptors. Clicking on the map initiates a click handler which performs a Web Feature Service request to GeoServer, returning features that intersect with the point clicked upon. Selected fields from these features are returned to a left-hand 'Results' div/panel, and the features are highlighted on the map by creating a temporary vector layer overlay.

This application was originally developed by <a href="http://www.klokantech.com/">Klokan Technologies GmbH</a> for the <a href="http://www.nls.uk">National Library of Scotland<a> in 2011. Following discussion in 2014, the application is now released as open-source, ON CONDITION THAT IT IS DEVELOPED WITH A DIFFERENT IMPLEMENTATION OF GEOSERVER, AND NOT AS A REPLACEMENT OR ALTERNATIVE TO VIEWING THE NATIONAL LIBRARY OF SCOTLAND'S MAPS. We hope that other libraries, archives and institutions may benefit from the code in making available their geographical collections.

View a more <a href="http://maps.nls.uk/geo/find/">complete working version of the application</a> on the National Library of Scotland Map Images website.
