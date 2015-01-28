(function() {

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
            xmlhttp.setRequestHeader('Content-type','application/json');
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
        length: 0,
        isEmpty: function(){
            retrun this.length === 0;
        },
        load: function () {
            var value = localStorage.getItem(this.localStorageId);
            if (value === null) {
                value = '[]';
            }
            this.value = JSON.parse(value);
            this.length = this.value.length;
        },
        save: function () {
            this.length = this.value.length;
            localStorage.setItem(this.localStorageId, JSON.stringify(this.value));
        },
        clear: function () {
            this.value = [];
            this.save();
        },
        copy: function (newId) {
            var newPersistedArray = new PersistedArray(newId);
            newPersistedArray.value = this.value.concat([]);
            newPersistedArray.save();
            return newPersistedArray;
        },
        add: function (value) {
            if (!this.contains(value)) {
                //we don't error on this one
                this.value.push(value);
                this.save();
            }
            return value;
        },
        shift: function (value) {
            if (!this.contains(value)) {
                //we don't error on this one
                this.value.shift(value);
                this.save();
            } else {
                throw new Error('trying to shift:' + value);
            }
            return value;
        },
        remove: function (item) {
            var index = this.value.indexOf(item);
            if (index == -1) {
                throw new Error('removing non-present item');
            }
            this.value.splice(index, 1);
            this.save();
            return index;
        },
        safeRemove: function (item) {
            var index = this.value.indexOf(item);
            if (index != -1) {
                this.value.splice(index, 1);
                this.save();
            }
            return index;
        },
        contains: function (item) {
            return this.value.indexOf(item) !== -1;
        },
        filter: function (id) {
            return new PersistedArray(id, [].filter.apply(this.value, [].slice.call(arguments, 1)));
        },
        forEach: function (func) {
            this.value.forEach(func); //not saving
        },
        pop: function(){
            if(this.isEmpty()) return null;
            var entry = this.value[this.length - 1];
            this.remove(this.length - 1);
            return entry;   
        },
        unshift: function(){
            if(this.isEmpty()) return null;
            var entry = this.value[0];
            this.remove(0);
            return entry;   
        },
        get: function(index){
            if(this.isEmpty()) return null;
            return this.value[index];   
        }
    };

    var Logit = function() {
        var LOG_PRIORITIES = {
            EMERGENCY : 0,
            ERROR : 1,
            WARN : 2,
            INFO : 3,
            LOG : 4,
            DEBUG : 5,
            TRACE : 6,
            VERBOSE : 7
        };
        
        var LOG_NAMES = {
          1: 'emergency',
          2: 'error',
          3: 'warn',
          4: 'info',
          5: 'debug',
          6: 'trace',
          7: 'verbose'  
        };
        
        var initialised = false;
        var uri,
            apiKey,
            options,
            queue;


        function createMessage(priority, message, dimensions) {
            if (!initialised) {
                alert('Logit.io plugin not initialised\n\nCall window.logit.init() first.');
                return;
            }
            
            if(options.defaultDimensions){
                for(var k in options.defaultDimensions){
                    dimensions[k] = options.defaultDimensions[k];
                }
            } 

            var message = {
                timestamp: new Date().toISOString(),
                message : message,
                level : LOG_NAMES[priority],
                properties : dimensions
            };
            queue.add(message);
            checkAndSend();
            
            if(options.logToConsole){
                var consoleFn;
                if(priority <= 1){
                    consoleFn = console.error;
                }else if(priority == 2){
                    consoleFn = console.warn;
                }else if(priority == 3){
                    consoleFn = console.info;
                }else if(priority == 5){
                    consoleFn = console.debug;
                }else{
                    consoleFn = console.log;
                }
                var msg = message.message;
                delete message.message;
                var details = JSON.stringify(message);
                consoleFn(LOG_NAMES[priority].toUpperCase()+': '+msg+'; '+details);
            }
        }
        
        function sendMessageQueue(){
            var message, request;
            while(!queue.isEmpty() && navigator.onLine){
                message = queue.pop();
                request = new AjaxRequest(uri, apiKey, options.onSuccess, options.onError);
                request.send(message);
            }
        }
        
        
        function checkAndSend(){
            if(navigator.onLine){
                sendMessageQueue();
            }
        }

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
         * </ul>
         *  
         */
        this.init = function(uri, apiKey, options) {
            if(!uri){
                alert('URL of Logit endpoint must be specified as first parameter when calling window.logit.init()');
                return;
            }
            uri = uri;
            if(!apiKey){
                alert('API key for Logit endpoint must be specified as second parameter when calling window.logit.init()');
                return;
            }
            apiKey = apiKey;
            options = options || {};
            
            queue = new PersistedArray('logit');
            
            document.addEventListener('resume', checkAndSend);
            document.addEventListener('online', checkAndSend);
            initialised = true;
        };

        this.emergency = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.EMERGENCY, message, dimensions);
        };

        this.error = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.ERROR, message, dimensions);
        };

        this.warn = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.WARN, message, dimensions);
        };

        this.info = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.INFO, message, dimensions);
        };

        this.log = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.LOG, message, dimensions);
        };

        this.debug = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.DEBUG, message, dimensions);
        };

        this.trace = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.TRACE, message, dimensions);
        };

        this.verbose = function(message, dimensions) {
            createMessage(LOG_PRIORITIES.VERBOSE, message, dimensions);
        };
    };

    module.exports = new Logit();
    
})();
