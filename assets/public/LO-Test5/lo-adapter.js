/*
 * -------------------
 * ADAPTER Module
 * -------------------
 *
 * Name: Generic Adapter Module
 * Description: Communicates with container, loads and interactes with Leonardodls SDK Activity
 *
 *
 * External Dependencies : ->
 * Following are shared/common dependencies (specified in index.html), and assumed to loaded via the platform)
 * 1. JQuery
 * 2. JSChannel
 *
 */
(function () {
	var channel, engine;
	var loWithoutControls = true;

	// variable to hold the Activity Player instance
	var activity = null;

	// var to hold current state
	var activityState = null;

	//var to hold the CheckAnswer button status
	var checkAnswerBtnVisible = false;

	//var to hold the Hint button status
	var hintBtnVisible = false;

	//var to hold the Next / Previous button status
	var nextBtnVisible = false;
	var prevBtnVisible = false;

	// relative path for the item JSON
	/*var jsonPath = "data/data.json";*/

	// var to hold unique ID for this LO
	var activityLaunchId;

	/* Function to create/initialize jsChannel */
	var initChannel = function (callback) {
		channel = Channel.build({
			window: window.parent,
			origin: '*',
			scope: 'cup-generic-default',
			onReady: function () {
				callback(channel);
			}
		});
	};

	/* Function to bind methods with the created jschannel instance.  */
	var bindChannel = function (channel) {
		channel.bind('receiveMessageFromContainer', function (trans, params) {
			if (params.type === 'checkAnswers') {
				activity.checkAnswer(checkAnswerCallback.bind(this));
			} else if (params.type === 'sendScores') {
				activity.submit(submitCallback.bind(this));
			} else if (params.type === 'reviewAnswers') {
				//[Review] - Need clarification and purpose of this event
				//return engine.reviewAnswers(params.type);
			} else if (params.type === 'goNext') {

				/*return engine.goToNextScreen(params.type);*/
				return activity.goToNextItem();

			} else if (params.type === 'goPrev') {

				/*return engine.goToPreviousScreen(params.type);*/
				return activity.goToPreviousItem();

			} else if (params.type === 'close') {

				/*return closeConnections();*/
				return activity.destroy();

			} else if (params.type === 'hint') {

				let remainingHintsCount = activity.getCurrentItem().showHints();

				if (remainingHintsCount == 0) {
					updateHintBtnStatus(true, false);
				}

			} else if (params.type === 'currentScreen') {

				return activity.getItems().indexOf(activity.getCurrentItem());

			} else if (params.type === 'totalScreens') {

				return activity.getItems().length;

			} else if (params.hasOwnProperty('type')) {
				throw { error: "method_not_found", message: 'method not found' };
			} else {
				throw { error: "invalid_request_structure", message: 'invalid request structure' };
			}
		});
	};

	/**
	 * This is the callback function invoked on activity.checkAnswer()
	 */
	var checkAnswerCallback = function(){
		updateState();
		updateCheckAnswerBtnStatus(true, false);
		updateHintBtnStatus(true, false);
	};

	/**
	 * This is the callback function invoked on activity.submit()
	 *
	 * @param {*} eventArgs
	 */
	var submitCallback = function(eventArgs){
		let payload = {
			min: eventArgs.response.score.min,
			max: eventArgs.response.score.max,
			raw: eventArgs.response.score.raw,
			scaled: eventArgs.response.score.scaled
		}
		updateState();
		generateStatement('scored', payload);
		updateCheckAnswerBtnStatus(true, false);
		updateHintBtnStatus(true, false);
		showResult(payload.raw);
	};

	/**
	 * Function invoked to show the result screen in the container
	 * @param {*} score
	 */
	var showResult = function(score){
		var params = {
			type: 'showResult',
			data: {
				score: score,
				review: true
			}
		};
		channel.call({
			method: 'sendMessageToContainer',
			params: params,
			success: function () { },
			error: function () {
				console.log('showResult method error');
			}
		});
	}

	/* Function called when container calls the close method. This function calls engine closeLO method and notifies the
	   container once LO is properly closed and cleaning operations performed, if any */
	var closeConnections = function () {

		channel.notify({
			method: 'sendMessageToContainer',
			params: {
				type: 'terminated'
			}
		});

		/*var callback = function () {

		}
		return activity.destroy(callback);*/
	};

	/* Function to get initialization paramters from the container */
	var getInitParameters = function (callback) {
		channel.call({
			method: 'sendMessageToContainer',
			params: {
				type: 'init'
			},
			success: function (params) {
				callback(params);
			}
		});
	};

	/* Function to load scripts */
	var getScript = function (src, callback) {
		var s = document.createElement("script");
		s.type = "text/" + (src.type || "javascript");
		s.src = src.src || src;
		s.async = false;
		s.onload = function () {
			var state = s.readyState;
			if (!state || /loaded|complete/.test(state)) {
				callback();
			}
		};
		s.onerror = function () {
			console.log('ERROR');
		};
		(document.body || document.head).appendChild(s);
	};

	/* Function called by the engine to notify container with the ready event when the LO is loaded and ready for interaction */
	var DOMReady = function () {
		channel.notify({
			method: 'sendMessageToContainer',
			params: {
				type: 'ready'
			}
		});
	};

	var firstItemReady = function () {
		channel.notify({
			method: 'sendMessageToContainer',
			params: {
				type: 'firstScreenReady'
			}
		});
	}

	/* Function called by the engine to pass controls change data to the container */
	var changeControlsVisibility = function (control, visible, buttonText) {
		var params = {
			type: 'controlsChange',
			data: {
				control: control,
				meta: {
					buttonText: buttonText,
					type: 'button'
				},
				visible: visible
			}
		};
		channel.call({
			method: 'sendMessageToContainer',
			params: params,
			success: function () { },
			error: function () {
				console.log('controlsChange method error');
			}
		});
	};

	/* Function called by the engine to pass dimensions change data to the container */
	var newDimensions = function (dimensions) {
		channel.call({
			method: 'sendMessageToContainer',
			params: {
				type: 'size',
				data: {
					size: dimensions
				}
			},
			success: function () { },
			error: function () {
				console.log('size method error');
			}
		});
	};

	var updateState = function () {
		activityState = activity.getState();

		channel.call({
			method: 'sendMessageToContainer',
			params: {
				type: 'newState',
				data: activityState
			},
			success: function () { },
			error: function () {
				console.log('newState method error');
			}
		});

	}

	var launchActivity = function () {

		// registering the app with leonardo SDK
		LeonardoApp.register();

		var container = document.getElementById('player-container');

		let options = {
			playerConfig: {

				buttons: {
					visible: !loWithoutControls
				}
			},
			events: {
				launched: function (eventArgs) {
					if (activityState) {
						activity.setState(activityState);
					}
					DOMReady();
					firstItemReady();
					updateCheckAnswerBtnStatus();
					updateHintBtnStatus();
					updateNaviagtionButtons();
				},
				change: function (eventArgs) {
					updateState();
					updateCheckAnswerBtnStatus();
				},
				destroy: function () {
					console.log('destroy event');
					closeConnections();
				},
				reset: function (eventArgs) {
					updateState();
					updateHintBtnStatus();
				},
				itemNavigation: function (eventArgs) {
					updateCheckAnswerBtnStatus();
					updateHintBtnStatus();
					updateNaviagtionButtons();
				},
				error: function (eventArgs) {
					console.log(eventArgs);
				},
				size: function (eventArgs) {
					dims = eventArgs.size;
					if (dims) {
						container.style.height = dims.height + "px";
						delete dims.width;
						/*container.style.width = dims.width + "px";*/
						newDimensions(dims);
					}
				}
			},
			uiStyles: {
				horizontalAlignment: "center"
			}
		}


		//let baseURL = document.baseURI;

		// dataJSON is made available in the window by the index.html
		/* var activityItems = dataJSON.map(item => {
			if (item.type == "url") {
				return baseURL + item[item.type];
			}
			else {
				return item[item.type];
			}
		}); */
		LeonardoApp.Activity.init(activityLaunchId, activityJson, container, options).then((player) => {
			activity = player;
		});

		LeonardoApp.Activity.render(activityLaunchId);

		/*fetch(jsonPath)
			.then(res => res.json())
			.then(function (itemArr) {

		});*/

	}

	/* Function to generate statement - started/launched/scored etc.*/
	var generateStatement = function (verb, payload) {
		var statement = {
			verb: {
				"id": "http://adlnet.gov/expapi/verbs/" + verb,
				"display": {
					"und": verb
				}
			},
			object: {
				"id": activityLaunchId
			}
		};
		if (verb === 'scored') {
			statement.result = {
				score: {
					max: payload.max,
					min: payload.min,
					raw: payload.raw,
					scaled: payload.raw / payload.max
				}
			}
		}
		var statementsArray = [];
		statementsArray.push(statement);
		channel.call({
			method: 'sendMessageToContainer',
			params: {
				type: 'newStatements',
				data: statementsArray
			},
			success: function () { },
			error: function () {
				console.log('newStatements method error');
			}
		});
	};

	var updateCheckAnswerBtnStatus = function (forceUpdate, visible) {
		if (forceUpdate) {
			changeControlsVisibility('checkAnswers', visible, "Check Answer");
			checkAnswerBtnVisible = visible;
		}
		else {
			let currentItemStatus = activityState ? activityState.itemBody.questions[activity.getCurrentItemIndex()].outcome.status : "NotStarted";
			if (currentItemStatus == "InProgress") {
				if (checkAnswerBtnVisible == false) {
					changeControlsVisibility('checkAnswers', true, "Check Answer");
					checkAnswerBtnVisible = true;
				}
			}
			else if (checkAnswerBtnVisible) {
				changeControlsVisibility('checkAnswers', false, "Check Answer");
				checkAnswerBtnVisible = false;
			}
		}
	};

	var updateHintBtnStatus = function (forceUpdate, visible) {
		if (forceUpdate) {
			changeControlsVisibility('hint', visible, "Hints");
			hintBtnVisible = visible;
		}
		else {
			if (activity.getCurrentItem().hasHints() && activity.getCurrentItem().remainingHints() != 0) {
				if (hintBtnVisible == false) {
					changeControlsVisibility('hint', true, "Hints");
					hintBtnVisible = true;
				}
			}
			else if (hintBtnVisible) {
				changeControlsVisibility('hint', false, "Hints");
				hintBtnVisible = false;
			}
		}
	};

	var updateNaviagtionButtons = function () {
		/* To be handled by Experience App Test Player*/
		let itemCount = activity.getItemCount();
		if (itemCount > 1) {
			if (activity.getCurrentItemIndex() == 0) {
				if (nextBtnVisible == false) {
					changeControlsVisibility('goNext', true, "Next");
					nextBtnVisible = true;
				}
				if (prevBtnVisible == true) {
					changeControlsVisibility('goPrev', false, "Previous");
					prevBtnVisible = false;
				}
			}
			else if (activity.getCurrentItemIndex() == itemCount - 1) {
				if (nextBtnVisible == true) {
					changeControlsVisibility('goNext', false, "Next");
					nextBtnVisible = false;
				}
				if (prevBtnVisible == false) {
					changeControlsVisibility('goPrev', true, "Previous");
					prevBtnVisible = true;
				}
			}
			else {
				if (nextBtnVisible == false) {
					changeControlsVisibility('goNext', true, "Next");
					nextBtnVisible = true;
				}
				if (prevBtnVisible == false) {
					changeControlsVisibility('goPrev', true, "Previous");
					prevBtnVisible = true;
				}
			}
		}
	}

	/* DOM Ready event */
	$(document).ready(function () {
		initChannel(
			function (channel) {
				bindChannel(channel);


				/* Get initiliazation paramters - contentPath and state, if any. */
				getInitParameters(function (initParams) {

					activityLaunchId = initParams.id || "launchId1";

					loWithoutControls = initParams.hasOwnProperty('loWithoutControls') ? initParams.loWithoutControls : true;
					if (initParams.hasOwnProperty('state') && initParams.state) {
						activityState = initParams.state;
					}

					// setting conumer config based on init params and default consumer key present in the index.html of this LO
					if (initParams && initParams.consumerConfig) {
						consumerConfig = initParams.consumerConfig;
					}

					if (consumerConfig) {
						LeonardoApp.setConfig(consumerConfig);
					}

					generateStatement('started');

					launchActivity();

				});
			});
	});

})();

/* Sample consumer config
{
 "consumerConfig": {
   "players": {
     "mcq": {
       "baseURL": "mcq-item-player-test3/releases/",
       "js": "0.0.4/libs-mcsr-radio-item-player",
       "dependencies": [
         "react",
         "react-dom",
         "libs-player-ui-components"
       ]
     },
     "react": {
       "baseURL": "react/releases/",
       "js": "16.12.0/react.development"
     },
     "react-dom": {
       "baseURL": "react-dom/releases/",
       "js": "16.12.0/react-dom.development"
     },
     "libs-player-ui-components": {
       "baseURL": "libs-player-ui-components/releases/",
       "js": "0.0.1/libs-player-ui-components"
     }
   }
 }
}
*/
