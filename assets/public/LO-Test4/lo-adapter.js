/*
 * -------------------
 * ADAPTER Module
 * -------------------
 *
 * Name: Generic Adapter Module
 * Description: Communicates with container, loads engines that expose the following functions:
 *      {
 *          init(),
 *          checkAnswer(),
 *          sendScores(),
 *          reviewAnswers(),
 *          closeLO() 
 *      }
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
	var currentState = null;

	// var to hold the current status of LO
	var currentStatus = null;

	// relative path for the item JSON
	/*var jsonPath = "data/data.json";*/

	// var to hold unique ID for this LO
	var activityLaunchId;

	// various status which are sent to container / experience app
	var status = {
		CHECKED: 'checked',
		RESET: 'reset',
		CHANGE: 'change'
	}

	// initializing currentScore with 0
	var currentScore = 0;


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

				activity.submit();
				/*changeControlsVisibility('hint', false, 'Hints');*/
				/*changeControlsVisibility ('checkAnswers', false, "Check My Work");*/


			} else if (params.type === 'sendScores') {
				//[Review] - Need clarification and purpose of this event
				//return engine.sendScores(params.type);
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
					changeControlsVisibility('hint', false, "Hints");
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
		currentState = {
			data: activity.getCurrentItem().getState(),
			status: currentStatus,
			score: currentScore
		};

		channel.call({
			method: 'sendMessageToContainer',
			params: {
				type: 'newState',
				data: currentState
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
					if (currentState && currentState.data) {
						activity.getCurrentItem().setState(currentState.data);
					}
					DOMReady();
					firstItemReady();

					changeControlsVisibility('checkAnswers', false, "Check Answer");
					changeControlsVisibility('checkAnswers', true, "Check Answer");

					let itemCount = activity.getItemCount();
					
					changeControlsVisibility('goNext', false, "Next");
					changeControlsVisibility('goPrev', false, "Previous");
					if (itemCount > 1) {
						changeControlsVisibility('goPrev', true, "Previous");
						changeControlsVisibility('goNext', true, "Next");
					}

					changeControlsVisibility('hint', false, "Hints");
					if (activity.getCurrentItem().hasHints()) {
						changeControlsVisibility('hint', true, "Hints");
					}

				},
				change: function (eventArgs) {
					let previousStatus = currentStatus;
					currentStatus = status.CHANGE;
					updateState();
					if (previousStatus != currentStatus) {
						changeControlsVisibility('checkAnswers', false, "Check Answer");
						changeControlsVisibility('checkAnswers', true, "Check Answer");
					}
				},
				destroy: function () {

					console.log('destroy event');
					closeConnections();
				},
				checkAnswer: function (eventArgs) {
					currentScore = eventArgs.response.score[activity.getCurrentItemIndex()].score.raw;
					currentStatus = status.CHECKED;
					updateState();
					/*changeControlsVisibility('hint', false, "Hints");*/
				},
				reset: function (eventArgs) {
					currentStatus = status.RESET;
					updateState();
				},
				itemNavigation: function (eventArgs) {
					updatedItem = activity.getItem(eventArgs.currentItem.index);
					changeControlsVisibility('hint', false, "Hints");
					if (updatedItem.hasHints() && updatedItem.remainingHints()) {
						changeControlsVisibility('hint', true, "Hints");
					}
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


		let baseURL = document.baseURI;

		// dataJSON is made available in the window by the index.html
		var activityItems = dataJSON.map(item => {
			if (item.type == "url") {
				return baseURL + item[item.type];
			}
			else {
				return item[item.type];
			}
		});
		LeonardoApp.Activity.init(activityLaunchId, activityItems, container, options).then((player) => {
			activity = player;
		});

		LeonardoApp.Activity.render(activityLaunchId);

		/*fetch(jsonPath)
			.then(res => res.json())
			.then(function (itemArr) {
				
			});*/


	}

	/* Function to generate statement - started/launched/scored etc.*/
	var generateStatement = function (verb) {
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
					max: maxScore,
					min: minScore,
					raw: score,
					scaled: score / maxScore
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
						currentState = initParams.state;
					}

					// setting conumer config based on init params and default consumer key present in the index.html of this LO
					if(initParams && initParams.consumerConfig){
						consumerConfig = initParams.consumerConfig;
					}
					if(consumerConfig){
						LeonardoApp.setConfig( consumerConfig );
					}
					
					generateStatement('started');

					launchActivity();

					
					
				});
			});
	});

})();
