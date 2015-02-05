Logit.io Cordova/Phonegap Plugin
=================================

This Cordova/PhoneGap Plugin provides apps with an interface to send debug information to a [Logit.io](http://logit.io/) endpoint.

[Logit.io](http://logit.io/) is [TODO]

Cordova/Phonegap 3.0 or greater is required.

## Contents

* [Installing](#installing)
* [Using the plugin](#using-the-plugin)
* [License](#license)
 
# Installing

Logit.io can be installed with:

[Cordova CLI](http://cordova.apache.org/docs/en/edge/guide_cli_index.md.html):

```
$ cordova plugin add io.logit.cordova
```

[PhoneGap CLI](http://docs.phonegap.com/en/edge/guide_cli_index.md.html):

```
$ phonegap plugin add io.logit.cordova
```

[Cordova Plugman](https://github.com/apache/cordova-plugman):


```
$ plugman install --plugin io.logit.cordova --platform <ios|amazon-fireos|android|blackberry10|wp8> --project platforms/<platform> --plugins_dir plugins
```

For example, to install for Android:

```
$ plugman install --plugin io.logit.cordova --platform android --project platforms/android --plugins_dir plugins
```


# Using the plugin

Once the plugin is installed, you app can make use of it by using cordova.require() to obtain a reference to it. 
It's recommended you make this a global reference so you can access the plugin from anywhere within your app, for example:


```
window.logit = cordova.require('io.logit.cordova.Logit');
```

You can then refer to the plugin from anywhere in your code as simply `logit`.

## Initialisation

Before you can use the plugin, you need to initialise it by passing it some setup options by calling the the `init()` function. 
The first two parameters are required and the third is a bunch of options:

```
logit.init(uri, apiKey, options);
```

### init() parameters

- {String} uri - (required) URI of Logit.io endpoint.
- {String} apiKey - (required) your Logit.io API Key, which grants you app access to the endpoint.
- {Object} options - (optional) parameters with the following key names:
    - {Function} onSuccess - callback function to execute on successfully sending a message to Logit.io endpoint.
    - {Function} onError - callback function to execute on error when sending a message to Logit.io endpoint.
    - {Object} defaultDimensions - JSON object describing default dimensions to send with every message. For example, device/OS details, app version details, user details, etc.
    - {Boolean} logToConsole - if true, messages will be logged using window.console methods. Defaults to false.
    - {Integer} verbosity - a value corresponding to an entry in this.LOG_PRIORITIES which filters log messages if the priority value is greater than the verbosity value. Defaults to this.LOG_PRIORITIES.VERBOSE.
    - {Integer} maxQueueSize - maxiumum number of messages to store in the persistent queue. Once this value is reached, adding a message to the end of the queue will cause the first message at the start of the queue to be dropped. Defaults to 2000.
    - {Integer} sendInterval - Interval in ms at which to send messages queued in local storage. Defaults to 200ms.

## Logging messages

The plugin provides the following logging functions, in order of decreasing priority:

- `logit.emergency(message, dimension);`
- `logit.error(message, dimension);`
- `logit.warn(message, dimension);`
- `logit.info(message, dimension);`
- `logit.log(message, dimension);`
- `logit.debug(message, dimension);`
- `logit.trace(message, dimension);`
- `logit.verbose(message, dimension);`

### Parameters

- {String} message - (required) the message to send
- {Object} dimensions - (optional) a list of custom dimensions in key/value form



## Additional functions

The plugin exposes the following additional functions:

- `logit.pauseSending();` Pauses sending of queued messages when online. Useful to conserve bandwith if you app is doing a bandwith-heavy operation. Note: if the number of queued messages reaches the configured maxQueueSize while sending is paused, each time a new message is added to the queue, the first message will be lost.
- `logit.resumeSending();` Resumes sending of queued messages when online.
- `logit.setVerbosity(verbosity);` Sets the current verbosity for logit messages.
    - {Mixed} verbosity - new verbosity value to set, either as an integer value of 0 to 7, of as the string name of the corresponding priority (case-insensitive), e.g. "error"
- `logit.getVerbosity();` Returns the current verbosity for logit messages.
- `logit.getPriorityName(priority);` Returns the string name of a log priority given the priority value. Returns null if a matching name is not found.
    - {Integer} priority - numerical priority value to find name for. 


License
================

The MIT License

Copyright (c) 2015 Logit.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.