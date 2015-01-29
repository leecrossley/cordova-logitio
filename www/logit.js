(function() {

    /**
     * @class Logit
     * Provides an interface to log applications messages from a Cordova app to a Logit.io endpoint 
     */
    var Logit = function() {
        
        /**
         * Determines the importance of the message.
         * Maps name to value.
         * @type {Object} 
         */
        this.LOG_PRIORITIES = {
            EMERGENCY : 0,
            ERROR : 1,
            WARN : 2,
            INFO : 3,
            LOG : 4,
            DEBUG : 5,
            TRACE : 6,
            VERBOSE : 7
        };
        
        /**
         * Whether plugin has been initialised with the init() method 
         * @type {Boolean}
         */
        this.initialised = false;
        
        /**
         * Flag indicating when sending of message queue has been paused using pauseSending() method
         * @type {Boolean} 
         */
        this.pausedSending = false;
        
        /**
         * A value corresponding to an entry in this.LOG_PRIORITIES which filters log messages if the priority value is greater than the verbosity value. 
         * Defaults to this.LOG_PRIORITIES.VERBOSE.
         * @type {Integer}  
         */
        this.verbosity = 7;
        
        /**
         * Maximum size of queued messages in local storage, after which messages at the start of the queue will get dropped as new messages are added.
         * @type {Integer} 
         */
        this.maxQueueSize = 2000;
        
        /**
         * URI of Logit endpoint to POST to 
         * @type {String}
         */
        this.uri;
        
        /**
         * API used to access logit endpoint
         * @type {String}
         */
        this.apiKey;
        
        /**
         * Configuration options 
         * @type {Object}
         */
        this.options;
        
        /**
         *  Persistent message queue
         * @type {PersistedArray}
         */
        this.queue;

        
        /**************
         * Public API *
         **************/

        /**
         * Initialises plugin for use. Must be called before logging functions are called.
         * @param {String} uri - URI of Logit.io endpoint
         * @param {String} apiKey - your Logit.io API Key, which grants you app access to the endpoint
         * @param {Object} options - optional parameters, with the following key names:
         * <ul>
         * <li>{Function} onSuccess - callback function to execute on successfully sending a message to Logit.io endpoint.</li>
         * <li>{Function} onError - callback function to execute on error when sending a message to Logit.io endpoint.</li>
         * <li>{Object} defaultDimensions - JSON object describing default dimensions to send with every message.</li>
         * <li>{Boolean} logToConsole - if true, messages will be logged using window.console methods. Defaults to false.</li>
         * <li>{Integer} verbosity - a value corresponding to an entry in this.LOG_PRIORITIES which filters log messages if the priority value is greater than the verbosity value. 
         * Defaults to this.LOG_PRIORITIES.VERBOSE. </li>
         * <li>{Integer} maxQueueSize - maxiumum number of messages to store in the persistent queue. 
         * Once this value is reached, adding a message to the end of the queue will cause the first message at the start of the queue to be dropped.
         * Defaults to 2000. </li>
         * </ul>
         *
         */
        this.init = function(uri, apiKey, options) {
            if (!uri) {
                alert('URL of Logit endpoint must be specified as first parameter when calling window.logit.init()');
                return;
            }
            this.uri = uri;
            if (!apiKey) {
                alert('API key for Logit endpoint must be specified as second parameter when calling window.logit.init()');
                return;
            }
            this.apiKey = apiKey;
            this.options = options || {};
            
            // Set verbosity
            var storedVerbosity = localStorage.getItem('logit_verbosity');
            if(storedVerbosity){
                this.verbosity = storedVerbosity;
            }else if(this.options.verbosity){
                this.verbosity = this.options.verbosity;
            }
            localStorage.setItem('logit_verbosity', this.verbosity);

            this.queue = new PersistedArray('logit_queue');

            document.addEventListener('resume', checkAndSend);
            document.addEventListener('online', checkAndSend);
            this.initialised = true;
            checkAndSend.call(this);
        };
        
        /**
         * Pauses sending of queued messages when online.
         * Note: if the number of queued messages reaches the configured maxQueueSize while sending is paused,
         * each time a new message is added to the queue, the first message will be lost. 
         */
        this.pauseSending = function(){
            this.pausedSending = true;
        };
        
        /**
         * Resumes sending of queued messages when online
         */
        this.resumeSending = function(){
            if(this.pausedSending){
                this.pausedSending = false;
                checkAndSend.call(this);
            }
        };
        
        /**
         * Sets the current verbosity for logit messages.
         * 
         * @param {Mixed} verbosity - new verbosity value to set, either as an integer value of 0 to 7,
         * of as the string name of the corresponding priority (case-insensitive), e.g. "error"
         */
        this.setVerbosity = function(verbosity){
            if(typeof(verbosity) == 'string' && typeof(this.LOG_PRIORITIES[verbosity.toUpperCase()]) != 'undefined'){
                verbosity = this.LOG_PRIORITIES[verbosity.toUpperCase()];
            }
            if(typeof(verbosity) != 'number' || verbosity < this.LOG_PRIORITIES.EMERGENCY || verbosity > this.LOG_PRIORITIES.VERBOSE){
                throw new Error('verbosity value must be an integer between '+this.LOG_PRIORITIES.EMERGENCY+' and '+this.LOG_PRIORITIES.VERBOSE);
            }
            
            if(this.verbosity == verbosity) return;
            
            this.info('Set logit verbosity', {
               previous: this.getPriorityName(this.verbosity).toLowerCase(),
               current: this.getPriorityName(verbosity).toLowerCase()
            },{
                force: true
            });
            this.verbosity = verbosity;
            localStorage.setItem('logit_verbosity', this.verbosity);
        };
        
        /**
         * Returns the current verbosity for logit messages.
         * @return {Integer} the current log verbosity 
         */
        this.getVerbosity = function(){
            return this.verbosity;
        }
        
        /**
         * Returns the string name of a log priority given the priority value.
         * Returns null if a matching name is not found.
         * @param {Integer} priority - numerical priority value to find name for.
         * @return {String} log priority name  
         */
        this.getPriorityName = function(priority){
            var k, name = null;
            for (k in this.LOG_PRIORITIES){
                if(this.LOG_PRIORITIES[k] == priority){
                    name = k;
                    break;
                }
            }
            return name;
        }
        
        /**
         * Sends a message with emergency priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.emergency = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.EMERGENCY, message, dimensions, opts);
        };
        
        /**
         * Sends a message with error priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.error = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.ERROR, message, dimensions, opts);
        };

        /**
         * Sends a message with warning priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.warn = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.WARN, message, dimensions, opts);
        };

        /**
         * Sends a message with info priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.info = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.INFO, message, dimensions, opts);
        };

        /**
         * Sends a message with log priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.log = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.LOG, message, dimensions, opts);
        };

        /**
         * Sends a message with debug priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.debug = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.DEBUG, message, dimensions, opts);
        };

        /**
         * Sends a message with trace priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.trace = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.TRACE, message, dimensions, opts);
        };

        /**
         * Sends a message with verbose priority.
         * @param {String} message - the message to send
         * @param {Object} dimensions - a list of custom dimensions in key/value form
         * @param {Object} opts - (optional) additional options:
         * <ul>
         * <li>{Boolean} force - if true, the message will be sent even if the priority is greater than the current verbosity.</li>
         * </ul> 
         */
        this.verbose = function(message, dimensions, opts) {
            createMessage.call(this, this.LOG_PRIORITIES.VERBOSE, message, dimensions, opts);
        };
        
        /*************
         * Internals *
         *************/
        function createMessage(priority, message, dimensions, opts) {
            if (!this.initialised) {
                alert('Logit.io plugin not initialised\n\nCall window.logit.init() first.');
                return;
            }
            
            opts = opts || {};
            
            if(priority > this.verbosity && !opts.force) return;
            
            dimensions = dimensions || {};
            if (this.options.defaultDimensions) {
                for (var k in this.options.defaultDimensions) {
                    dimensions[k] = this.options.defaultDimensions[k];
                }
            }

            var message = {
                timestamp : new Date().toISOString(),
                message : message,
                level : this.getPriorityName(priority).toLowerCase(),
                properties : dimensions
            };
            
            if(this.queue.length == this.maxQueueSize){
                this.queue.unshift(); //remove first item
                this.warn('Logit message queue message size exceeded', null, {force: true});
            }
            this.queue.add(message);
            
            checkAndSend.call(this);

            if (this.options.logToConsole) {
                var consoleFn;
                if (priority <= 1) {
                    consoleFn = console.error;
                } else if (priority == 2) {
                    consoleFn = console.warn;
                } else if (priority == 3) {
                    consoleFn = console.info;
                } else if (priority == 5) {
                    consoleFn = console.debug;
                } else {
                    consoleFn = console.log;
                }
                var msg = message.message;
                delete message.message;
                var details = JSON.stringify(message);
                consoleFn.call(console, this.getPriorityName(priority) + ': ' + msg + '; ' + details);
            }
        }

        function sendMessageQueue() {
            var message,
                request;
            while (this.queue && !this.queue.isEmpty() && navigator.onLine && !this.pausedSending) {
                message = this.queue.pop();
                request = new AjaxRequest(this.uri, this.apiKey, this.options.onSuccess || function(){}, this.options.onError || function(){});
                request.send(message);
            }
        }

        function checkAndSend() {
            if (navigator.onLine) {
                sendMessageQueue.call(this);
            }
        }
    };
    
    function AjaxRequest(uri, apiKey, successCallback, failureCallback) {
        this.uri = uri;
        this.apiKey = apiKey;
        this.xhr = this.createXhr();
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
    }


    AjaxRequest.prototype = {
        createXhr : function() {
            var xhr = this.xhr = new XMLHttpRequest();
            this.openXhr();
            xhr.onreadystatechange = this.onreadystatechange.bind(this);
            return xhr;
        },
        openXhr : function() {
            this.readyState = 0;
            var xhr = this.xhr;
            xhr.open('POST', this.uri, true);
            xhr.setRequestHeader('API-Key', this.apiKey);
            xhr.setRequestHeader('Content-type', 'application/json');
        },
        send : function(data) {
            try {
                this.xhr.send(JSON.stringify(data));
            } catch (e) {
                this.failureCallback(e);
            }
        },
        onreadystatechange : function() {
            var xhr = this.xhr;
            this.readyState = this.xhr.readyState;
            if (xhr.readyState == 4) {
                if (!xhr.responseText || xhr.responseText.charAt(0) != '{') {
                    var error = new Error();
                    error.code = xhr.status;
                    error.statusText = xhr.statusText;
                    error.uri = this.uri;
                    if (xhr.responseText.charAt(0) != '{') {
                        error.message = 'No connection';
                    } else {
                        error.message = 'Invalid server response';
                    }
                    return this.failureCallback(error);
                }
                this.successCallback(xhr.responseText);
            }
        },
    };

    function PersistedArray(localStorageId) {
        this.localStorageId = localStorageId;
        this.load();
    }


    PersistedArray.prototype = {
        length : 0,
        isEmpty : function() {
            return this.length === 0;
        },
        load : function() {
            var value = localStorage.getItem(this.localStorageId);
            if (value === null) {
                value = '[]';
            }
            this.value = JSON.parse(value);
            this.length = this.value.length;
        },
        save : function() {
            this.length = this.value.length;
            localStorage.setItem(this.localStorageId, JSON.stringify(this.value));
        },
        clear : function() {
            this.value = [];
            this.save();
        },
        copy : function(newId) {
            var newPersistedArray = new PersistedArray(newId);
            newPersistedArray.value = this.value.concat([]);
            newPersistedArray.save();
            return newPersistedArray;
        },
        add : function(value) {
            if (!this.contains(value)) {
                //we don't error on this one
                this.value.push(value);
                this.save();
            }
            return value;
        },
        shift : function(value) {
            if (!this.contains(value)) {
                //we don't error on this one
                this.value.shift(value);
                this.save();
            } else {
                throw new Error('trying to shift:' + value);
            }
            return value;
        },
        remove : function(item) {
            var index = this.value.indexOf(item);
            if (index == -1) {
                throw new Error('removing non-present item');
            }
            this.value.splice(index, 1);
            this.save();
            return index;
        },
        safeRemove : function(item) {
            var index = this.value.indexOf(item);
            if (index != -1) {
                this.value.splice(index, 1);
                this.save();
            }
            return index;
        },
        contains : function(item) {
            return this.value.indexOf(item) !== -1;
        },
        filter : function(id) {
            return new PersistedArray(id, [].filter.apply(this.value, [].slice.call(arguments, 1)));
        },
        forEach : function(func) {
            this.value.forEach(func);
            //not saving
        },
        pop : function() {
            if (this.isEmpty())
                return null;
            var entry = this.value[this.length - 1];
            this.remove(entry);
            return entry;
        },
        unshift : function() {
            if (this.isEmpty())
                return null;
            var entry = this.value[0];
            this.remove(entry);
            return entry;
        },
        get : function(index) {
            if (this.isEmpty())
                return null;
            return this.value[index];
        }
    };
    
    module.exports = new Logit();
})();
