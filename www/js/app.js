angular.module('starter', ['ionic', 'rt.eventemitter'])

.run(function($ionicPlatform, BeaconService, ProximiioService) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });

  document.addEventListener('deviceready', function () {
    BeaconService.start();
    ProximiioService.start();
  });
})

.controller('Dashboard', function ($scope, BeaconService, ProximiioService) {
	$scope.messages = ["Started"];
    BeaconService.on('error', function (err) {
    	console.log('error', err);
    	$scope.$apply(function () {
    		$scope.messages.push("eddystone: " + err);
    	});
    });
    BeaconService.on('message', function (msg) {
    	console.log('message', msg);
    	$scope.$apply(function () {
    		$scope.messages.push("eddystone: " + msg);
    	});
    });
    BeaconService.on('scanComplete', function (beacons) {
    	console.log('beacons', beacons);
    	$scope.$apply(function () {
    		$scope.beacons = beacons;
    	});
    });
    ProximiioService.on('outputTrigger', function (output) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: outputTrigger");
    	});
    });
    ProximiioService.on('inputTrigger', function (enter, geofence) {
		$scope.$apply(function () {
			$scope.messages.push("proximiio: inputTrigger");
		});
    });
    ProximiioService.on('positionChange', function (coords) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: positionChange");
    	});
    });
    ProximiioService.on('floorChanged', function (floor) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: floorChanged");
    	});
    });
    ProximiioService.on('proximiioReady', function (visitorId) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: proximiioReady");
    	});
    });
    ProximiioService.on('beaconFound', function (beacon) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: beaconFound");
    	});
    });
    ProximiioService.on('beaconLost', function (beacon) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: beaconLost");
    	});
    });
    ProximiioService.on('error', function (code, id, str) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: error");
    	});
    });
    ProximiioService.on('message', function (msg) {
    	$scope.$apply(function () {
    		$scope.messages.push("proximiio: " + msg);
    	});
    });
})

// Angular abstraction of evothings.eddystone
.factory('BeaconService', function (eventEmitter) {
    var eventHandler = {};
    eventEmitter.inject(eventHandler);

	// Dictionary of beacons.
	var beacons = {};

	function stop() {
		evothings.eddystone.stopScan();
	}

	function startScan() {
		eventHandler.emit('message', 'Started');
		evothings.eddystone.startScan(function(beacon) {
			// Update beacon data.
			beacon.timeStamp = Date.now();
			beacon.signalStrength = mapBeaconRSSI(beacon.rssi);
			beacons[beacon.address] = beacon;

			// Remove old beacons
			var timeNow = Date.now();
			for (var key in beacons)
			{
				// Only show beacons updated during the last 60 seconds.
				var beacon = beacons[key];
				if (beacon.timeStamp + 60000 < timeNow)
				{
					delete beacons[key];
				}
			}

			eventHandler.emit('scanComplete', getSortedBeaconList(beacons));
		}, function(error) {
			eventHandler.emit('error', 'Eddystone scan error: ' + error);
		});
	};

	// Map the RSSI value to a value between 1 and 100.
	function mapBeaconRSSI(rssi) {
		if (rssi >= 0) return 1; // Unknown RSSI maps to 1.
		if (rssi < -100) return 100; // Max RSSI
		return 100 + rssi;
	};

	function getSortedBeaconList(beacons) {
		var beaconList = [];
		for (var key in beacons)
		{
			beaconList.push(beacons[key]);
		}
		beaconList.sort(function(beacon1, beacon2)
		{
			return beacon1.signalStrength < beacon2.signalStrength;
		});
		return beaconList;
	};

	return {
		start: startScan,
		stop: stop,
		on: eventHandler.on.bind(eventHandler)
	};
})

// Angular abstraction of Proximiio
.factory('ProximiioService', function (eventEmitter) {
    var eventHandler = {};
    eventEmitter.inject(eventHandler);

	return {
		start: function () {
		    proximiio.setOutputTriggerCallback(function (output) {
		    	eventHandler.emit('outputTrigger', output);
		    });

		    proximiio.setInputTriggerCallback(function(enter, geofence) {
		    	eventHandler.emit('inputTrigger', enter, geofence);
		    });

		    proximiio.setPositionChangeCallback(function(coords) {
		    	eventHandler.emit('positionChange', coords);
		    });

		    proximiio.setFloorChangedCallback(function(floor) {
		    	eventHandler.emit('floorChanged', floor);
		    });

		    proximiio.setProximiioReadyCallback(function(visitorId) {
		    	eventHandler.emit('proximiioReady', visitorId);
		    	eventHandler.emit('message', 'setting run on background -> true');
			    proximiio.setRunOnBackground(true);
		    });

		    proximiio.setBeaconFoundCallback(function(beacon) {
		    	eventHandler.emit('beaconFound', beacon);
		    });

		    proximiio.setBeaconLostCallback(function(beacon) {
		    	eventHandler.emit('beaconLost', beacon);
		    });

		    proximiio.setErrorCallback(function(code, id, str) {
		    	eventHandler.emit('error', code, id, str);
		    });

		    proximiio.setToken('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImlzcyI6IjllNDYzYzM4YTcyNjQ3MzJhNDc1YWU4MGUxNTU0NGEzIiwidHlwZSI6ImFwcGxpY2F0aW9uIiwiYXBwbGljYXRpb25faWQiOiIyMWZkYTFkMy1hM2M4LTQzMWMtOGIyYi1lMjZhMjdhOTMxYjAifQ.I8QAPbc1QxMnUzK4qRUzAu1fBQqP412iGyZmtt_s3fc');
		},
		on: eventHandler.on.bind(eventHandler)
	};
});
