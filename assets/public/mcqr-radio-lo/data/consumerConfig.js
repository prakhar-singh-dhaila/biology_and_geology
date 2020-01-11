var consumerConfig = {
    "players": {
      "playerMap": {
        "test": "multi-item-activity-player",
        "mcsr-radio": "mcq-radio-player"
      },
      "modules": {
        "multi-item-activity-player": {
          "baseURL": "https://d3f2ws3vg5f2o9.cloudfront.net/modules/multi-item-activity-player/releases/",
          "version": "0.0.12",
          "js": "0.0.12/multiItemActivityPlayer",
          "css": "0.0.12/multiItemActivityPlayer"
        },
        "mcq-radio-player": {
          "baseURL": "https://d3f2ws3vg5f2o9.cloudfront.net/modules/mcq-radio-player/releases/",
          "version": "0.0.7",
          "js": "0.0.7/libs-mcsr-radio-item-player",
          "dependencies": [
            "react",
            "react-dom",
            "libs-player-ui-components"
          ]
        },
        "react": {
          "baseURL": "https://d3f2ws3vg5f2o9.cloudfront.net/modules/react/releases/",
          "version": "16.12.0",
          "js": "16.12.0/react.development"
        },
        "react-dom": {
          "baseURL": "https://d3f2ws3vg5f2o9.cloudfront.net/modules/react-dom/releases/",
          "version": "16.12.0",
          "js": "16.12.0/react-dom.development"
        },
        "libs-player-ui-components": {
          "baseURL": "https://d3f2ws3vg5f2o9.cloudfront.net/modules/libs-player-ui-components/releases/",
          "version": "0.0.1",
          "js": "0.0.1/libs-player-ui-components"
        }
      }
    }
  }