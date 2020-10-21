'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');

function typedOwnPropertyNames(obj) {
    return Object.getOwnPropertyNames(obj);
}
function isSymbol(t) {
    return typeof t === 'symbol';
}
function isPrimitive(input) {
    return input !== Object(input);
}
function isPlainObject(input) {
    return Object.prototype.toString.call(input) === '[object Object]';
}
function noop() { }
function appendSet(set, setToAppend) {
    if (!setToAppend) {
        return;
    }
    setToAppend.forEach(function (item) {
        set.add(item);
    });
}
function createStackCallback(onFinish) {
    var callsStack = [];
    function perform(fn, args, data) {
        callsStack.push(data !== null && data !== void 0 ? data : null);
        try {
            return fn.apply(this, args);
        }
        finally {
            callsStack.pop();
            onFinish();
        }
    }
    function isRunning() {
        return callsStack.length > 0;
    }
    function getCurrentData() {
        var _a;
        return (_a = callsStack[callsStack.length - 1]) !== null && _a !== void 0 ? _a : null;
    }
    var manager = {
        isRunning: isRunning,
        getCurrentData: getCurrentData,
    };
    return [perform, manager];
}
var serializationCache = new WeakMap();
function serialize(input) {
    if (!isPlainObject(input) && serializationCache.has(input)) {
        return serializationCache.get(input);
    }
    // Make sure input can be safely serialized without resulting with same output for different input.
    if (process.env.NODE_ENV !== 'production' && !isSerializable(input)) {
        throw new Error('It is not possible to serialize provided value');
    }
    // Dont watch input during serialization!
    return JSON.stringify(dontWatch(function () { return input; }));
}
function isShallowSerializable(value) {
    return (typeof value === 'undefined' ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        typeof value === 'number' ||
        Array.isArray(value) ||
        isPlainObject(value));
}
function isSerializable(value) {
    var isNestedSerializable;
    if (!isShallowSerializable(value)) {
        return false;
    }
    for (var property in value) {
        if (value.hasOwnProperty(property)) {
            if (!isShallowSerializable(value[property])) {
                return false;
            }
            if (typeof value[property] == 'object') {
                isNestedSerializable = isSerializable(value[property]);
                if (!isNestedSerializable) {
                    return false;
                }
            }
        }
    }
    return true;
}
function manyToMany() {
    var leftToRight = new Map();
    var rightToLeft = new Map();
    var left = {
        add: function (left, right) {
            var items = leftToRight.get(left);
            if (!items) {
                (items = new Set()), leftToRight.set(left, items);
            }
            items.add(right);
            return right;
        },
        get: function (left) {
            var _a;
            return (_a = leftToRight.get(left)) !== null && _a !== void 0 ? _a : null;
        },
        remove: function (left) {
            var rights = leftToRight.get(left);
            if (!rights) {
                return;
            }
            rights.forEach(function (right) {
                var rightLefts = rightToLeft.get(right);
                if (!rightLefts) {
                    throw new Error('Incorrect manyToMany state');
                }
                rightLefts.delete(left);
            });
            leftToRight.delete(left);
        },
    };
    var right = {
        add: function (right, left) {
            var items = rightToLeft.get(right);
            if (!items) {
                (items = new Set()), rightToLeft.set(right, items);
            }
            items.add(left);
            return left;
        },
        get: function (right) {
            var _a;
            return (_a = rightToLeft.get(right)) !== null && _a !== void 0 ? _a : null;
        },
        remove: function (right) {
            var lefts = rightToLeft.get(right);
            if (!lefts) {
                return;
            }
            lefts.forEach(function (left) {
                var leftRights = leftToRight.get(left);
                if (!leftRights) {
                    throw new Error('Incorrect manyToMany state');
                }
                leftRights.delete(right);
            });
            rightToLeft.delete(right);
        },
    };
    function create(leftToRightRelationName, rightToLeftRelationName) {
        var _a;
        return _a = {},
            _a[leftToRightRelationName] = left,
            _a[rightToLeftRelationName] = right,
            _a;
    }
    return { create: create };
}
var foo = manyToMany().create('owners', 'houses');

var _a;
var allowInternal = (_a = tslib.__read(createStackCallback(noop), 2), _a[0]), allowInternalManager = _a[1];
function warnIfUsingInternal(internalName) {
    if (process.env.NODE_ENV === 'production') {
        return;
    }
    if (allowInternalManager.isRunning()) {
        return;
    }
    console.warn("You're using internal function of \"statek\" - " + internalName + ". If you're sure what you're doing - wrap your call inside allowInternal(() => yourCode) to dismiss this warning.");
}

var callbackReaction = new WeakMap();
// Erased reactions are fully removed from registry. This is to keep track of them and be able to
// warn user or ignore 1+ calls to erase instead of throwing.
var erasedReactions = new WeakSet();
var reactionsRegistry = new WeakMap();
function getReactionEntry(reaction) {
    var info = reactionsRegistry.get(reaction);
    if (!info) {
        throw new Error('Trying to get options for non-reaction');
    }
    return info;
}
function getReactionOptions(reaction) {
    return getReactionEntry(reaction).options;
}
function isManualReaction(reaction) {
    return !!getReactionEntry(reaction).manualCallback;
}
/**
 * @internal
 */
function registerLazyReactionCallback(reaction, callback) {
    warnIfUsingInternal('registerLazyReactionCallback');
    var entry = getReactionEntry(reaction);
    if (entry.manualCallback) {
        throw new Error('Reaction already has manual callback');
    }
    entry.manualCallback = callback;
}
function cleanReactionReadData(reaction) {
    var entry = getReactionEntry(reaction);
    var propsMemberships = entry.watchedPropertiesMemberships;
    // Iterate over each list in which this reaction is registered.
    // Each list represents single key of some proxy object that this reaction readed from.
    propsMemberships.forEach(function (propReactions) {
        // Remove this reaction from such list.
        propReactions.delete(reaction);
    });
    // As we're removed from each list - clear links that pointed to them.
    propsMemberships.clear();
}
function getCallbackWrapperReaction(input) {
    return callbackReaction.get(input);
}
function applyReaction(reaction) {
    var entry = getReactionEntry(reaction);
    if (entry.manualCallback) {
        entry.manualCallback();
        return;
    }
    var context = getReactionOptions(reaction).context;
    reaction.apply(context);
}
function isReaction(reaction) {
    return reactionsRegistry.has(reaction);
}
/**
 * @internal
 */
function registerReaction(reaction, wrappedCallback, options) {
    if (options === void 0) { options = {}; }
    warnIfUsingInternal('registerReaction');
    if (reactionsRegistry.has(reaction)) {
        throw new Error('This reaction is already registered');
    }
    if (callbackReaction.has(wrappedCallback)) {
        throw new Error('This callback is already wrapped in reaction');
    }
    callbackReaction.set(wrappedCallback, reaction);
    if (options.name) {
        Object.defineProperty(reaction, 'name', { value: options.name });
    }
    var entry = {
        manualCallback: null,
        options: options,
        stopSubscribers: new Set(),
        watchedPropertiesMemberships: new Set(),
        wrappedCallback: wrappedCallback,
    };
    reactionsRegistry.set(reaction, entry);
    return reaction;
}
function eraseReaction(reaction) {
    if (isReactionErased(reaction)) {
        console.warn("Stopping the reaction that is already stopped.");
        return;
    }
    if (!isReaction(reaction)) {
        throw new Error('Cannot stop function that is not a reaction');
    }
    var entry = getReactionEntry(reaction);
    cleanReactionReadData(reaction);
    erasedReactions.add(reaction);
    callbackReaction.delete(entry.wrappedCallback);
    reactionsRegistry.delete(reaction);
    entry.stopSubscribers.forEach(function (subscriber) {
        subscriber();
    });
}
function resetReaction(reaction) {
    if (!isReaction(reaction)) {
        throw new Error('Cannot stop non reaction');
    }
    erasedReactions.delete(reaction);
    cleanReactionReadData(reaction);
}
function isReactionErased(reaction) {
    if (erasedReactions.has(reaction)) {
        return true;
    }
    if (!isReaction(reaction)) {
        throw new Error('Checking if reaction is stopped providing non reaction');
    }
    return false;
}
function subscribeToReactionStopped(reaction, callback) {
    // If this reaction is already stopped - call callback instantly
    if (erasedReactions.has(reaction)) {
        callback();
        // but still add it to list of listeners in case this reaction is started and stopped again.
    }
    if (!isReaction(reaction)) {
        throw new Error('Cannot subscribe to stop of non-reaction');
    }
    var stopSubscribers = getReactionEntry(reaction).stopSubscribers;
    stopSubscribers.add(callback);
    return function stop() {
        stopSubscribers.delete(callback);
    };
}

/**
 * @internal
 */
function waitForSchedulersToFlush() {
    return tslib.__awaiter(this, void 0, void 0, function () {
        return tslib.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (process.env.NODE_ENV !== 'production') {
                        warnIfUsingInternal('waitForSchedulersToFlush');
                    }
                    return [4 /*yield*/, Promise.all(Array.from(flushPromises))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var flushPromises = new Set();
function createAsyncScheduler(wrapper) {
    var pendingReactions = new Set();
    var timeout = null;
    var flushPromise = null;
    function run() {
        var reactions = Array.from(pendingReactions);
        pendingReactions.clear();
        reactions.forEach(function (reaction) {
            applyReaction(reaction);
        });
    }
    function enqueue() {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!timeout) return [3 /*break*/, 2];
                        return [4 /*yield*/, flushPromise];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2:
                        flushPromise = new Promise(function (resolve) {
                            timeout = setTimeout(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                                return tslib.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            timeout = null;
                                            if (!wrapper) {
                                                run();
                                                resolve();
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, wrapper(run)];
                                        case 1:
                                            _a.sent();
                                            flushPromises.delete(flushPromise);
                                            flushPromise = null;
                                            resolve();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, 0);
                        });
                        flushPromises.add(flushPromise);
                        return [2 /*return*/];
                }
            });
        });
    }
    return function add(reaction) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_a) {
                pendingReactions.add(reaction);
                return [2 /*return*/, enqueue()];
            });
        });
    };
}
var asyncScheduler = createAsyncScheduler();
var syncScheduler = function (reaction) {
    applyReaction(reaction);
};
var defaultScheduler = syncScheduler;
function getDefaultScheduler() {
    return defaultScheduler;
}
function setDefaultScheduler(scheduler) {
    defaultScheduler = scheduler;
}
var builtInSchedulers = {
    sync: syncScheduler,
    async: asyncScheduler,
};
function resolveSchedulerInput(input) {
    if (!input) {
        return getDefaultScheduler();
    }
    if (typeof input === 'string') {
        if (!builtInSchedulers[input]) {
            throw new Error("Incorrect scheduler name - " + input);
        }
        return builtInSchedulers[input];
    }
    return input;
}

// reactions can call each other and form a call stack
var watchingReactionsStack = [];
function callWithReactionsStack(reactionCallback, functionToCall) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var runningReaction = getRunningReaction();
    if (runningReaction) {
        addReactionParent(reactionCallback, runningReaction);
    }
    clearReactionChildren(reactionCallback);
    var context = getReactionOptions(reactionCallback).context;
    if (isReactionErased(reactionCallback)) {
        throw new Error('Cannot call reaction that is stopped.');
    }
    if (watchingReactionsStack.includes(reactionCallback)) {
        throw new Error('Recursive reaction calling itself detected. It might be caused by reaction mutating the store in a way that triggers it before it has finished or by 2 different manual reactions calling each other.');
    }
    // release the (obj -> key -> reactions) connections
    // and reset the cleaner connections
    cleanReactionReadData(reactionCallback);
    try {
        // set the reaction as the currently running one
        // this is required so that we can create (store.prop -> reaction) pairs in the get trap
        watchingReactionsStack.push(reactionCallback);
        return Reflect.apply(functionToCall, context !== null && context !== void 0 ? context : null, args);
    }
    finally {
        // always remove the currently running flag from the reaction when it stops execution
        watchingReactionsStack.pop();
    }
}
function getLastRunningReactionFromStack() {
    if (watchingReactionsStack.length === 0) {
        return null;
    }
    var hookedReaction;
    for (var i = watchingReactionsStack.length - 1; i >= 0; i--) {
        hookedReaction = watchingReactionsStack[i];
        if (typeof hookedReaction === 'function') {
            return hookedReaction;
        }
        if (isReactionErased(hookedReaction.reaction) ||
            !hookedReaction.getIsStillRunning()) {
            continue;
        }
        return hookedReaction.reaction;
    }
    return null;
}
function getRunningReaction() {
    // Is some regular reaction is running - return it
    // if (watchingReactionsStack[watchingReactionsStack.length - 1]) {
    //   return watchingReactionsStack[watchingReactionsStack.length - 1]!;
    // }
    return getLastRunningReactionFromStack();
}
function detectRunningReactionForOperation(readOperation) {
    var e_1, _a;
    // If dontWatch is running - we're totally ingoring reactions.
    if (dontWatchManager.isRunning()) {
        return null;
    }
    var lastRunningReactionOnStack = getLastRunningReactionFromStack();
    if (lastRunningReactionOnStack) {
        return lastRunningReactionOnStack;
    }
    // Check if regular reaction is running - if so - return it and dont continue to custom hooks.
    // Check if we have any reaction hooks running.
    if (injectReactionHooks.size > 0) {
        var hookedReactionInfo = void 0;
        try {
            for (var injectReactionHooks_1 = tslib.__values(injectReactionHooks), injectReactionHooks_1_1 = injectReactionHooks_1.next(); !injectReactionHooks_1_1.done; injectReactionHooks_1_1 = injectReactionHooks_1.next()) {
                var nextCurrentReactionHook = injectReactionHooks_1_1.value;
                hookedReactionInfo = nextCurrentReactionHook(readOperation);
                if (!hookedReactionInfo) {
                    continue;
                }
                if (!isReaction(hookedReactionInfo.reaction)) {
                    throw new Error('Function returned from `registerGetCurrentReactionHook` is not a reaction. It needs to be wrapped in registerReaction first.');
                }
                return hookedReactionInfo.reaction;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (injectReactionHooks_1_1 && !injectReactionHooks_1_1.done && (_a = injectReactionHooks_1.return)) _a.call(injectReactionHooks_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return null;
}
var injectReactionHooks = new Set();
/**
 * @internal
 */
function addInjectReactionHook(hook) {
    warnIfUsingInternal('registerReadOperationReactionHook');
    injectReactionHooks.add(hook);
    return function remove() {
        injectReactionHooks.delete(hook);
    };
}
/**
 * @internal
 */
function injectReaction(injectedReaction) {
    warnIfUsingInternal('injectReaction');
    watchingReactionsStack.push(injectedReaction);
    return function removeInjected() {
        if (watchingReactionsStack.length === 0) {
            throw new Error('Cannot remove injected reaction as there are no injected reactions');
        }
        if (watchingReactionsStack[watchingReactionsStack.length - 1] !==
            injectedReaction) {
            throw new Error('Calling remove reaction after some other reactions were injected');
        }
        watchingReactionsStack.pop();
    };
}
// Parents
var reactionParents = new WeakMap();
var reactionChildren = new WeakMap();
function addReactionParent(child, parent) {
    var parents = reactionParents.get(child);
    var parentChildren = reactionChildren.get(parent);
    if (!parentChildren) {
        parentChildren = new Set();
        reactionChildren.set(parent, parentChildren);
    }
    if (!parents) {
        parents = new Set();
        reactionParents.set(child, parents);
    }
    parents.add(parent);
    parentChildren.add(child);
}
function clearReactionChildren(parent) {
    var children = reactionChildren.get(parent);
    if (!children) {
        return;
    }
    var nextChildParents;
    children.forEach(function (nextChild) {
        nextChildParents = reactionParents.get(nextChild);
        if (nextChildParents) {
            nextChildParents.delete(parent);
        }
        children.delete(nextChild);
    });
}

var ITERATION_KEY = Symbol('iteration key');
var readOperationsRegistry = new WeakMap();
// const _c = _countReadOperations();
// setInterval(() => {
//   console['log'](_c());
// }, 500);
function initializeObjectReadOperationsRegistry(rawObject) {
    // this will be used to save (obj.key -> reaction) connections later
    readOperationsRegistry.set(rawObject, new Map());
}
function registerReactionReadOperation(reaction, readOperation) {
    if (readOperation.type === 'iterate') {
        readOperation.key = ITERATION_KEY;
    }
    var reactionsPropsMapForTarget = readOperationsRegistry.get(readOperation.target);
    var reactionsForKey = reactionsPropsMapForTarget.get(readOperation.key);
    if (!reactionsForKey) {
        reactionsForKey = new Set();
        reactionsPropsMapForTarget.set(readOperation.key, reactionsForKey);
    }
    // save the fact that the key is used by the reaction during its current run
    if (!reactionsForKey.has(reaction)) {
        reactionsForKey.add(reaction);
        getReactionEntry(reaction).watchedPropertiesMemberships.add(reactionsForKey);
    }
}
function getMutationImpactedReactions(mutationOperation) {
    var impactedReactions = getSelectedAnyChangeReactions(mutationOperation.target);
    var targetKeysReactionsMap = readOperationsRegistry.get(mutationOperation.target);
    var reactionsForKey = targetKeysReactionsMap.get(mutationOperation.key);
    reactionsForKey && appendSet(impactedReactions, reactionsForKey);
    // Inform each item when set/map is cleared
    if (mutationOperation.type === 'clear') {
        targetKeysReactionsMap.forEach(function (reactionsForAnotherProp) {
            appendSet(impactedReactions, reactionsForAnotherProp);
        });
    }
    if (mutationOperation.type === 'add' ||
        mutationOperation.type === 'delete' ||
        mutationOperation.type === 'clear' ||
        mutationOperation.type === 'set') {
        var reactionsForIteration = targetKeysReactionsMap.get(ITERATION_KEY);
        reactionsForIteration &&
            appendSet(impactedReactions, reactionsForIteration);
    }
    return impactedReactions;
}
// register the currently running reaction to be queued again on obj.key mutations
function handleStoreReadOperation(readOperation) {
    // get the current reaction from the top of the stack
    var runningReaction = detectRunningReactionForOperation(readOperation);
    if (!runningReaction) {
        return;
    }
    debugOperation(runningReaction, readOperation);
    registerReactionReadOperation(runningReaction, readOperation);
}
function handleStoreMutationOperation(mutationOperation) {
    // iterate and queue every reaction, which is triggered by obj.key mutation
    var impactedReactions = getMutationImpactedReactions(mutationOperation);
    impactedReactions.forEach(function (reaction) {
        debugOperation(reaction, mutationOperation);
        requestReactionCallNeeded(reaction);
    });
}
function debugOperation(reaction, operation) {
    var _a, _b;
    (_b = (_a = getReactionOptions(reaction)).debug) === null || _b === void 0 ? void 0 : _b.call(_a, operation);
}

var _a$1;
var hasOwnProperty = Object.prototype.hasOwnProperty;
function proxifyIterator(iterator, isEntries, parent) {
    var originalNext = iterator.next;
    iterator.next = function () {
        var _a = originalNext.call(iterator), done = _a.done, value = _a.value;
        if (!done) {
            if (isEntries) {
                value[1] = createChildStoreIfNeeded(value[1], parent);
            }
            else {
                value = createChildStoreIfNeeded(value, parent);
            }
        }
        return { done: done, value: value };
    };
    return iterator;
}
function has(key) {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    handleStoreReadOperation({ target: target, key: key, type: 'has' });
    return proto.has.apply(target, arguments);
}
function get(key) {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    handleStoreReadOperation({ target: target, key: key, type: 'get' });
    return createChildStoreIfNeeded(proto.get.apply(target, arguments), target);
}
function add(key) {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var hadKey = proto.has.call(target, key);
    var operation = {
        target: target,
        key: key,
        value: key,
        type: 'add',
    };
    // forward the operation before queueing reactions
    var result = proto.add.apply(target, arguments);
    if (!hadKey) {
        handleStoreMutationOperation(operation);
    }
    return result;
}
function set(key, value) {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var hadKey = proto.has.call(target, key);
    if (hadKey) {
        var oldValue = proto.get.call(target, key);
        if (value === oldValue) {
            return;
        }
        var operation_1 = {
            target: target,
            key: key,
            value: value,
            type: 'set',
        };
        // forward the operation before queueing reactions
        var result_1 = proto.set.apply(target, arguments);
        handleStoreMutationOperation(operation_1);
        return result_1;
    }
    var operation = { target: target, key: key, value: value, type: 'add' };
    var result = proto.set.apply(target, arguments);
    handleStoreMutationOperation(operation);
    return result;
}
function deleteImplementation(key) {
    var target = storeToRawMap.get(this);
    var operation = {
        target: target,
        key: key,
        type: 'delete',
    };
    var proto = Reflect.getPrototypeOf(this);
    var hadKey = proto.has.call(target, key);
    // forward the operation before queueing reactions
    var result = proto.delete.apply(target, arguments);
    if (hadKey) {
        handleStoreMutationOperation(operation);
    }
    return result;
}
function clear() {
    var target = storeToRawMap.get(this);
    var operation = { target: target, type: 'clear' };
    var proto = Reflect.getPrototypeOf(this);
    var hadItems = target.size !== 0;
    // forward the operation before queueing reactions
    var result = proto.clear.apply(target, arguments);
    if (hadItems) {
        handleStoreMutationOperation(operation);
    }
    return result;
}
function forEach(callback) {
    var _a;
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var operation = { target: target, type: 'iterate' };
    handleStoreReadOperation(operation);
    // swap out the raw values with their observable pairs
    // before passing them to the callback
    var wrappedCallback = function (value) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return callback.apply(void 0, tslib.__spread([createChildStoreIfNeeded(value, target)], rest));
    };
    return (_a = proto.forEach).call.apply(_a, tslib.__spread([target, wrappedCallback], args));
}
function keys() {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    handleStoreReadOperation({ target: target, type: 'iterate' });
    return proto.keys.apply(target, arguments);
}
function values() {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var operation = { target: target, type: 'iterate' };
    handleStoreReadOperation(operation);
    var iterator = proto.values.apply(target, arguments);
    return proxifyIterator(iterator, false, target);
}
function entries() {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var operation = { target: target, type: 'iterate' };
    handleStoreReadOperation(operation);
    var iterator = proto.entries.apply(target, arguments);
    return proxifyIterator(iterator, true, target);
}
function symbolIterator() {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    var operation = { target: target, type: 'iterate' };
    handleStoreReadOperation(operation);
    var iterator = proto[Symbol.iterator].apply(target, arguments);
    return proxifyIterator(iterator, target instanceof Map, target);
}
function getSize() {
    var target = storeToRawMap.get(this);
    var proto = Reflect.getPrototypeOf(this);
    handleStoreReadOperation({ target: target, type: 'iterate' });
    return Reflect.get(proto, 'size', target);
}
var mapLikeProxyWrappers = (_a$1 = {},
    _a$1[Symbol.iterator] = symbolIterator,
    _a$1.has = has,
    _a$1.get = get,
    _a$1.add = add,
    _a$1.set = set,
    _a$1.delete = deleteImplementation,
    _a$1.clear = clear,
    _a$1.forEach = forEach,
    _a$1.keys = keys,
    _a$1.values = values,
    _a$1.entries = entries,
    Object.defineProperty(_a$1, "size", {
        get: function () {
            return getSize.apply(this);
        },
        enumerable: false,
        configurable: true
    }),
    _a$1);
var mapLikeProxyHandlers = {
    // Instead of creating entire map of handlers - it'll be dynamic.
    // When trying to get each proxy handler.
    // If we're able to cover it - use 'proxy-like' version. Otherwise - return normal callback from
    // nativ object.
    get: function (target, key, receiver) {
        // get proxy method either from instrumentations, or if not avaliable - from target element.
        // instrument methods and property accessors to be reactive
        target = hasOwnProperty.call(mapLikeProxyWrappers, key)
            ? mapLikeProxyWrappers
            : target;
        return Reflect.get(target, key, receiver);
    },
};

var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var wellKnownSymbols = new Set(typedOwnPropertyNames(Symbol)
    .map(function (key) {
    return Symbol[key];
})
    .filter(isSymbol));
// intercept get operations on observables to know which reaction uses their properties
var basicProxyHandlers = {
    get: function (target, key, receiver) {
        if (process.env.NODE_ENV !== 'production' && key === 'toJSON') {
            console.warn("You're calling JSON.stringify on the store. This will read every single, nested field of the store in reactive mode which can have performance impact. Consider calling `JSON.stringify(dontWatch(() => store))` instead.");
        }
        var result = Reflect.get(target, key, receiver);
        // do not register (observable.prop -> reaction) pairs for well known symbols
        // these symbols are frequently retrieved in low level JavaScript under the hood
        if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
            return result;
        }
        // register and save (observable.prop -> runningReaction)
        handleStoreReadOperation({
            target: target,
            key: key,
            type: 'get',
        });
        // do not violate the none-configurable none-writable prop get handler invariant
        // fall back to none reactive mode in this case, instead of letting the Proxy throw a TypeError
        var descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.writable) === false && descriptor.configurable === false) {
            return result;
        }
        return createChildStoreIfNeeded(result, target);
    },
    has: function (target, key) {
        // register and save (observable.prop -> runningReaction)
        handleStoreReadOperation({ target: target, key: key, type: 'has' });
        return Reflect.has(target, key);
    },
    ownKeys: function (target) {
        handleStoreReadOperation({ target: target, type: 'iterate' });
        return Reflect.ownKeys(target);
    },
    // intercept set operations on observables to know when to trigger reactions
    set: function (target, key, value, receiver) {
        // make sure to do not pollute the raw object with observables
        if (typeof value === 'object' && value !== null) {
            value = storeToRawMap.get(value) || value;
        }
        // save if the object had a descriptor for this key
        var hadKey = hasOwnProperty$1.call(target, key);
        if (!hadKey) {
            var operation_1 = {
                target: target,
                key: key,
                value: value,
                type: 'add',
            };
            // execute the set operation before running any reaction
            var result_1 = Reflect.set(target, key, value, receiver);
            handleStoreMutationOperation(operation_1);
            return result_1;
        }
        // save if the value changed because of this set operation
        var oldValue = target[key];
        if (value === oldValue) {
            return true;
        }
        var operation = {
            target: target,
            key: key,
            value: value,
            type: 'set',
        };
        // execute the set operation before running any reaction
        var result = Reflect.set(target, key, value, receiver);
        // do not queue reactions if the target of the operation is not the raw receiver
        // (possible because of prototypal inheritance)
        if (target !== storeToRawMap.get(receiver)) {
            return result;
        }
        handleStoreMutationOperation(operation);
        return result;
    },
    deleteProperty: function (target, key) {
        // save if the object had the key
        var hadKey = hasOwnProperty$1.call(target, key);
        var operation = {
            target: target,
            key: key,
            type: 'delete',
        };
        // execute the delete operation before running any reaction
        var result = Reflect.deleteProperty(target, key);
        // only queue reactions for delete operations which resulted in an actual change
        if (hadKey) {
            handleStoreMutationOperation(operation);
        }
        return result;
    },
};

// prettier-ignore
var iterationArrayMethodNames = [
    'forEach', 'map', 'every', 'find', 'some', 'some', 'filter', 'reduce', 'reduceRight', 'findIndex', 'indexOf', 'lastIndexOf',
];
var wrappedArrayIterableMethods = new Map();
iterationArrayMethodNames.forEach(function (callbackName) {
    var originalArrayMethod = Array.prototype[callbackName];
    function wrapped(observable) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var operation = { target: this, type: 'iterate' };
        handleStoreReadOperation(operation);
        return runInIteration.call(observable, originalArrayMethod, args, operation);
    }
    wrappedArrayIterableMethods.set(callbackName, wrapped);
});
var _a$2 = tslib.__read(createStackCallback(noop), 2), runInIteration = _a$2[0], runInIterationManager = _a$2[1];
var arrayProxyHandlers = tslib.__assign(tslib.__assign({}, basicProxyHandlers), { has: function (target, key) {
        // register and save (observable.prop -> runningReaction)
        !runInIterationManager.getCurrentData() &&
            handleStoreReadOperation({ target: target, key: key, type: 'has' });
        return Reflect.has(target, key);
    },
    get: function (target, key, receiver) {
        if (wrappedArrayIterableMethods.has(key)) {
            return wrappedArrayIterableMethods
                .get(key)
                .bind(target, receiver);
        }
        var result = Reflect.get(target, key, receiver);
        // do not register (observable.prop -> reaction) pairs for well known symbols
        // these symbols are frequently retrieved in low level JavaScript under the hood
        if (typeof key === 'symbol' && wellKnownSymbols.has(key)) {
            return result;
        }
        if (!runInIterationManager.getCurrentData()) {
            handleStoreReadOperation({
                target: target,
                key: key,
                type: key === 'length' ? 'iterate' : 'get',
            });
        }
        // do not violate the none-configurable none-writable prop get handler invariant
        // fall back to none reactive mode in this case, instead of letting the Proxy throw a TypeError
        var descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if ((descriptor === null || descriptor === void 0 ? void 0 : descriptor.writable) === false && descriptor.configurable === false) {
            return result;
        }
        // if we are inside a reaction and observable.prop is an object wrap it in an observable too
        // this is needed to intercept property access on that object too (dynamic observable tree)
        return createChildStoreIfNeeded(result, target);
    } });

// built-in object can not be wrapped by Proxies
// their methods expect the object instance as the 'this' instead of the Proxy wrapper
// complex objects are wrapped with a Proxy of instrumented methods
// which switch the proxy to the raw object and to add reactive wiring
var builtInProxyHandlers = new Map([
    [Map, mapLikeProxyHandlers],
    [Set, mapLikeProxyHandlers],
    [WeakMap, mapLikeProxyHandlers],
    [WeakSet, mapLikeProxyHandlers],
    // basic
    [Object, basicProxyHandlers],
    [Array, arrayProxyHandlers],
    [Int8Array, basicProxyHandlers],
    [Uint8Array, basicProxyHandlers],
    [Uint8ClampedArray, basicProxyHandlers],
    [Int16Array, basicProxyHandlers],
    [Uint16Array, basicProxyHandlers],
    [Int32Array, basicProxyHandlers],
    [Uint32Array, basicProxyHandlers],
    [Float32Array, basicProxyHandlers],
    [Float64Array, basicProxyHandlers],
]);
function canWrapInProxy(input) {
    if (isPrimitive(input)) {
        return 'Non object value';
    }
    if (typeof input === 'function') {
        return 'Non object value';
    }
    var constructor = input.constructor;
    if (builtInProxyHandlers.has(constructor)) {
        return true;
    }
    var isBuiltIn = typeof constructor === 'function' &&
        constructor.name in globalThis &&
        // @ts-ignore
        globalThis[constructor.name] === constructor;
    if (isBuiltIn) {
        return 'Built in object or accessable in global / window';
    }
    return true;
}
function wrapObjectInProxy(input) {
    var _a;
    if (!canWrapInProxy(input)) {
        return input;
    }
    return new Proxy(input, (_a = builtInProxyHandlers.get(input.constructor)) !== null && _a !== void 0 ? _a : basicProxyHandlers);
}

var storeToRawMap = new WeakMap();
var rawToStoreMap = new WeakMap();
/**
 * Nomenclature.
 *
 * 'Store' name is used for any store itself as well as any observable part of it.
 *
 * Eg. const a = store({foo: {bar: 2}});
 * a is store,
 * but a.foo is store as well.
 */
/**
 * Map that links store children to parent store.
 */
var targetParentTarget = new WeakMap();
/**
 * Map that keeps list of reactions that should be called if any child part of given store
 * is modified.
 *
 * This, together with child -> parent map allows us to detect and pick reactions at any level.
 */
var selectedAnyChangeReactions = new WeakMap();
function registerSelectedAnyChangeReaction(store, reaction) {
    if (!isStore(store)) {
        throw new Error('Any change observable can only be added on observable');
    }
    var observableRaw = getStoreRaw(store);
    var currentReactionsSet = selectedAnyChangeReactions.get(observableRaw);
    if (!currentReactionsSet) {
        currentReactionsSet = new Set();
        selectedAnyChangeReactions.set(observableRaw, currentReactionsSet);
    }
    if (!isReaction(reaction)) {
        throw new Error('Only reaction can be added to any change watching');
    }
    currentReactionsSet.add(reaction);
    return function remove() {
        currentReactionsSet.delete(reaction);
    };
}
/**
 * Will return all any change reactions of store part or any parent part.
 *
 * Should be used only if we know that there is some such reaction with `isStoreAnyChangeWatched`
 * because it is more expensive to run then previous one.
 */
function getSelectedAnyChangeReactions(storePartRaw) {
    var reactions = new Set();
    // Get direct reactions
    appendSet(reactions, selectedAnyChangeReactions.get(storePartRaw));
    // Collect reactions from all parents.
    var parent = targetParentTarget.get(storePartRaw);
    while (parent) {
        appendSet(reactions, selectedAnyChangeReactions.get(parent));
        parent = targetParentTarget.get(parent);
    }
    return reactions;
}
function store(storeFactory) {
    var _a, _b, _c;
    var storeInput = resolveStoreFactory(storeFactory);
    var canWrapInProxyError = canWrapInProxy(storeInput);
    if (canWrapInProxyError !== true) {
        var untypedInput = storeInput;
        var inputConstructorName = (_c = (_b = (_a = untypedInput === null || untypedInput === void 0 ? void 0 : untypedInput.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : untypedInput === null || untypedInput === void 0 ? void 0 : untypedInput.name) !== null && _c !== void 0 ? _c : 'Unknown';
        throw new Error("Observable cannot be created from " + inputConstructorName + ". Reason - " + canWrapInProxyError);
    }
    // if it is already an observable or it should not be wrapped, return it
    if (storeToRawMap.has(storeInput)) {
        return storeInput;
    }
    // if it already has a cached observable wrapper, return it
    var existingObservable = rawToStoreMap.get(storeInput);
    if (existingObservable) {
        return existingObservable;
    }
    // otherwise create a new observable
    var newStore = wrapObjectInProxy(storeInput);
    // save these to switch between the raw object and the wrapped object with ease later
    rawToStoreMap.set(storeInput, newStore);
    storeToRawMap.set(newStore, storeInput);
    // init basic data structures to save and cleanup later (observable.prop -> reaction) connections
    initializeObjectReadOperationsRegistry(storeInput);
    return newStore;
}
function createChildStoreIfNeeded(storePartRaw, parentRaw) {
    if (dontWatchManager.isRunning()) {
        return storeToRawMap;
    }
    var observableObj = rawToStoreMap.get(storePartRaw);
    // If we have observable already created - always return it
    if (observableObj) {
        return observableObj;
    }
    // If it's not possible to create observable - no point of checking if we should create it.
    if (canWrapInProxy(storePartRaw) !== true) {
        return storePartRaw;
    }
    targetParentTarget.set(storePartRaw, parentRaw);
    return store(storePartRaw);
}
function isStore(store) {
    if (isPrimitive(store)) {
        return false;
    }
    return storeToRawMap.has(store);
}
function assertStore(store, message) {
    if (!isStore) {
        throw new Error(message);
    }
}
function getStoreRaw(store) {
    if (!isStore(store)) {
        throw new Error('trying to get raw object from input that is not observable');
    }
    return storeToRawMap.get(store);
}
function resolveStoreFactory(factory) {
    if (typeof factory === 'function') {
        return factory();
    }
    return factory;
}

var reactionPendingPromises = new WeakMap();
function addReactionPendingPromise(reaction, promise) {
    var pendingPromises = reactionPendingPromises.get(reaction);
    if (!pendingPromises) {
        pendingPromises = new Set();
        reactionPendingPromises.set(reaction, pendingPromises);
    }
    pendingPromises.add(promise);
}
function getAllPendingReactionsResolvedPromise(reaction) {
    var alreadyPending = reactionPendingPromises.get(reaction);
    if (!alreadyPending) {
        return Promise.resolve();
    }
    return Promise.all(alreadyPending);
}
var reactionSuspendRetries = new WeakMap();
function isReactionSuspended(reaction) {
    return reactionSuspendRetries.has(reaction);
}
var MAX_ALLOWED_SUSPENSE_RETRIES = 5;
function callWithSuspense(callback, reaction) {
    var _a;
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var retries = (_a = reactionSuspendRetries.get(reaction)) !== null && _a !== void 0 ? _a : 0;
    if (retries > MAX_ALLOWED_SUSPENSE_RETRIES) {
        var errorMessage = 'The same reaction suspended 5 times in a row. Assuming error to avoid infinite loop. Some promise is that is suspending is probably re-created on each call';
        if (process.env.NODE_ENV !== 'production') {
            console.warn(errorMessage);
        }
        throw new Error(errorMessage);
    }
    try {
        var result = callback.apply(void 0, tslib.__spread(args));
        // Did properly resolve. Let's reset suspended retries counter
        reactionSuspendRetries.delete(reaction);
        return result;
    }
    catch (errorOrPromise) {
        reactionSuspendRetries.set(reaction, retries + 1);
        if (errorOrPromise instanceof Promise) {
            addReactionPendingPromise(reaction, errorOrPromise);
            var allPendingResolvedPromise = getAllPendingReactionsResolvedPromise(reaction);
            allPendingResolvedPromise
                .then(function () {
                // trying again
                requestReactionCallNeeded(reaction);
            })
                .catch(function (error) {
                // since watch is called by itself after suspended and retried - there is no way this error could be catched.
                // As promises it suspended with are provided by user - if they don't have .catch by themselves - it seems ok to
                // result with uncaught promise exception.
                // ?  throw error;
            });
            if (isManualReaction(reaction)) {
                throw allPendingResolvedPromise;
            }
            // we don't have to return watch result value while it's suspended for non-lazy reactions
            // @ts-ignore
            return;
        }
        // Error.
        throw errorOrPromise;
    }
}

var _a$3, _b, _c, _d, _e;
function requestReactionCallNeeded(reaction) {
    // Don't request lazy-reaction re-run while it is suspended.
    if (isReactionSuspended(reaction) && isManualReaction(reaction)) {
        return;
    }
    /**
     * We are in 'syncEvery' mode. It means we skip both batching and scheduling and call all
     * reactions instantly.
     */
    if (syncEveryManager.isRunning()) {
        applyReaction(reaction);
        return;
    }
    var isSync = syncManager.isRunning();
    // Both 'sync' and `batch' will schedule reactions in batched mode.
    if (batchManager.isRunning() || isSync) {
        // Send reaction to batch queue.
        reactionsBatchQueue.add(reaction, isSync);
        return;
    }
    // We're not using batch mode - send reaction to scheduler.
    sendReactionToScheduler(reaction, false);
}
/**
 * Ordered map keeping current queue of batched reactions. As it is Map - it keeps proper order of
 * reactions keeping reactions added last at the end of 'entries' of the map.
 *
 * Boolean flag indicates if reaction schould be sync.
 * sync === true - skip scheduler and apply it when flushing.
 * sync === false - when flushing - send reaction to scheduler.
 */
var reactionsQueue = new Map();
var reactionsBatchQueue = {
    add: function (reaction, isSync) {
        reactionsQueue.set(reaction, isSync);
    },
    flush: function () {
        if (!reactionsQueue.size) {
            return;
        }
        // Make sure to copy reactions instead of iterating on queue set reference.
        // It is because during reaction calls some new reactions could be added to the queue before
        // current flush finishes.
        var reactionsToCall = Array.from(reactionsQueue);
        // Instantly after we have copy of all reactions - clear the queue.
        reactionsQueue.clear();
        // Send reactions to either be called instantly or sent to scheduler depending on if they
        // were sync or not.
        reactionsToCall.forEach(sendQueuedReactionToScheduler);
    },
};
// Map entry wrapper to avoid creating new function ref on each flush.
function sendQueuedReactionToScheduler(_a) {
    var _b = tslib.__read(_a, 2), reaction = _b[0], isSync = _b[1];
    sendReactionToScheduler(reaction, isSync);
}
/**
 * This function will decide if to apply it instantly or call it to scheduler depending on if it
 * was scheduled in sync mode or not.
 */
function sendReactionToScheduler(reaction, isSync) {
    // Reaction was scheduled in sync mode. Skip schedulers and apply it instantly.
    if (isSync) {
        applyReaction(reaction);
        return;
    }
    var scheduler = resolveSchedulerInput(getReactionOptions(reaction).scheduler);
    scheduler(reaction);
}
/**
 * Will delay enqueing reactions until the end of this call. Will also make sure that no same reaction
 * will be scheduled twice at the end of this hook.
 */
var batch = (_a$3 = tslib.__read(createStackCallback(reactionsBatchQueue.flush), 2), _a$3[0]), batchManager = _a$3[1];
/**
 * Will skip schedulers, but remain in batch mode. It means that even if async scheduler exists
 * for some reaction - all reactions will be called in batch after this call ends.
 */
var sync = (_b = tslib.__read(createStackCallback(reactionsBatchQueue.flush), 2), _b[0]), syncManager = _b[1];
/**
 * Will disable schedulers and batching. It means each single mutation will instantly call all
 * attached reactions.
 */
var syncEvery = (_c = tslib.__read(createStackCallback(reactionsBatchQueue.flush), 2), _c[0]), syncEveryManager = _c[1];
/**
 * Escape from watching store access.
 *
 * It can be called inside part of `watch` callback and such read access will not be registered.
 */
var _dontWatch = (_d = tslib.__read(createStackCallback(noop), 2), _d[0]), dontWatchManager = _d[1];
function dontWatch(callback) {
    // make sure to unwrap direct result of the callback eg dontWatch(() => store); - should return store raw object
    var result = _dontWatch(callback);
    if (isStore(result)) {
        return getStoreRaw(result);
    }
    return result;
}
var allowNestedWatch = (_e = tslib.__read(createStackCallback(noop), 2), _e[0]), allowNestedWatchManager = _e[1];

var _a$4;
var warming = (_a$4 = tslib.__read(createStackCallback(noop), 2), _a$4[0]), warmingManager = _a$4[1];
function warmSelectors() {
    var selectors = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        selectors[_i] = arguments[_i];
    }
    return tslib.__awaiter(this, void 0, void 0, function () {
        var runningReaction, promises, error_1;
        return tslib.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    runningReaction = getRunningReaction();
                    promises = [];
                    warming(function () {
                        selectors.forEach(function (selector) {
                            try {
                                // request selector value.
                                selector.value;
                                // if it's
                            }
                            catch (errorOrPromise) {
                                // Selectors might suspend during warming, but we still want to warm all of them.
                                // We're however adding all pending promises to this reaction to be able to wait for them all before
                                // re-running if it will be set this way in reaction settings
                                if (errorOrPromise instanceof Promise) {
                                    promises.push(errorOrPromise);
                                }
                                // We're also not throwing their errors as they would be thrown anyway as soon as value of some
                                // rejected selector is read.
                            }
                        });
                    });
                    if (runningReaction) {
                        promises.forEach(function (promise) {
                            addReactionPendingPromise(runningReaction, promise);
                        });
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, warming(function () {
                            return Promise.all(promises);
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}

var resourcePromises = new WeakSet();
function isResourcePromise(promise) {
    return resourcePromises.has(promise);
}
function singleValueResource(getter, options) {
    var status = { state: 'unstarted' };
    function getStatus() {
        return status;
    }
    function updateStatus(newStatus) {
        var _a;
        status = newStatus;
        (_a = options === null || options === void 0 ? void 0 : options.onStatusChange) === null || _a === void 0 ? void 0 : _a.call(options, newStatus);
    }
    function update() {
        try {
            updateValue();
        }
        catch (error) { }
    }
    function restart() {
        status = { state: 'unstarted' };
        try {
            updateValue();
        }
        catch (error) { }
    }
    function updateValue() {
        if (status.state !== 'resolved' && status.state !== 'unstarted') {
            throw new Error('Cannot update resource if its not resolved or unstarted');
        }
        var previousValue = status.state === 'resolved' ? { value: status.value } : null;
        var getterResult;
        // Make sure getter error itself is handled
        try {
            getterResult = getter();
        }
        catch (error) {
            // getter() function thrown. Mark as rejected
            updateStatus({
                state: 'getterError',
                error: error,
            });
            throw error;
        }
        // Resource is sync. Result instantly and mark as resolved.
        if (!(getterResult instanceof Promise)) {
            updateStatus({
                state: 'resolved',
                value: getterResult,
            });
            return getterResult;
        }
        if (!previousValue) {
            // Resource is a promise.
            updateStatus({
                state: 'pending',
                promise: getterResult,
            });
            resourcePromises.add(getterResult);
        }
        else {
            updateStatus({
                state: 'updating',
                oldValue: previousValue.value,
                promise: getterResult,
            });
        }
        // Wait for promise to resolve and instantly update state.
        getterResult
            .then(function (value) {
            updateStatus({
                state: 'resolved',
                value: value,
            });
        })
            .catch(function (resolveError) {
            updateStatus({
                state: 'rejected',
                error: resolveError,
            });
        });
        // Suspend with promise.
        throw getterResult;
    }
    function read() {
        if (status.state === 'pending') {
            throw status.promise;
        }
        if (status.state === 'resolved') {
            return status.value;
        }
        if (status.state === 'rejected') {
            throw status.error;
        }
        if (status.state === 'getterError') {
            throw status.error;
        }
        if (status.state === 'unstarted') {
            return updateValue();
        }
        if (status.state === 'updating') {
            return status.oldValue;
        }
        throw new Error('Invalid resource state');
    }
    function promise() {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var value, status_1;
            return tslib.__generator(this, function (_a) {
                try {
                    value = read();
                    return [2 /*return*/, value];
                }
                catch (error) {
                    status_1 = getStatus();
                    if (status_1.state === 'pending') {
                        return [2 /*return*/, status_1.promise];
                    }
                    if (status_1.state === 'rejected') {
                        throw status_1.error;
                    }
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    }
    return {
        read: read,
        getStatus: getStatus,
        update: update,
        restart: restart,
        promise: promise,
    };
}

var asyncReactions = new WeakMap();
function getAsyncReactionData(reaction) {
    if (!asyncReactions.has(reaction)) {
        throw new Error('Provided reaction is not async reaction');
    }
    return asyncReactions.get(reaction);
}
function markReactionAsAsync(reaction) {
    var existingData = asyncReactions.get(reaction);
    if (existingData) {
        return existingData;
    }
    var asyncData = {
        pendingPhases: new Set(),
    };
    asyncReactions.set(reaction, asyncData);
    return asyncData;
}
function hasReactionPendingPhase(reaction, phase) {
    return getAsyncReactionData(reaction).pendingPhases.has(phase);
}
function assertNoPendingPhaseRunning(reaction, msg) {
    var e_1, _a;
    var phases = getAsyncReactionData(reaction).pendingPhases;
    try {
        for (var phases_1 = tslib.__values(phases), phases_1_1 = phases_1.next(); !phases_1_1.done; phases_1_1 = phases_1.next()) {
            var phase = phases_1_1.value;
            // If there is some phase, but it is cancelled - it will not call any changes anyway.
            if (phase.isCancelled) {
                continue;
            }
            throw new Error(msg !== null && msg !== void 0 ? msg : 'Async reaction has pending phase already');
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (phases_1_1 && !phases_1_1.done && (_a = phases_1.return)) _a.call(phases_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
function cancelPendingPhasesIfNeeded(reaction) {
    var phases = getAsyncReactionData(reaction).pendingPhases;
    phases.forEach(function (phase) {
        phase.cancel();
    });
}
function assertNoPendingPhaseAfterReactionFinished(reaction) {
    assertNoPendingPhaseRunning(reaction, 'Async reaction has pending phase after it finished');
}
function isAsyncReaction(reaction) {
    return asyncReactions.has(reaction);
}
var _originalThen = Promise.prototype.then;
/**
 * This is modified version of then that will be injected into Promise prototype.
 *
 * The goal is to make it as transparent as possible and only be fired when needed.
 *
 * What it does is than when calling 'then' - it will check if '.then' was called during some reaction.
 *
 * If so - it will remember this reaction and inject the same reaction during running of then callback.
 *
 * This way reactions are able to be async without loosing their context.
 */
function then(onFulfilled, onRejected) {
    var _this = this;
    // If this has no fulfilled callback - no point of wrapping.
    if (!onFulfilled) {
        return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
    }
    // Try to get running reaction.
    var callerReaction = getRunningReaction();
    // If then is called outside of reaction - use original then.
    if (!callerReaction) {
        return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
    }
    if (warmingManager.isRunning()) {
        return Reflect.apply(_originalThen, this, [onFulfilled, onRejected]);
    }
    var asyncData = markReactionAsAsync(callerReaction);
    var phase = {
        cancel: function () {
            phase.isCancelled = true;
        },
        isCancelled: false,
    };
    asyncData.pendingPhases.add(phase);
    /**
     * Now we're wrapping onFulfilled callback with the one that will inject reaction that is running now in the moment when this promise will resolve.
     */
    var wrappedOnFulfilled = function (result) {
        // If this phase was cancelled before it resolved.
        if (phase.isCancelled) {
            var error = new AsyncReactionCancelledError('Async reaction is cancelled as some of its dependencies changed while it was still running.');
            if (onRejected) {
                Reflect.apply(onRejected, _this, [error]);
                return;
            }
            return Promise.reject(error);
        }
        // Double check if phase was not changed without canelling this one. This could lead to nasty bugs and should never happen.
        if (!hasReactionPendingPhase(callerReaction, phase)) {
            throw new Error('Incorrect internal phase state - running phase is not cancelled, but pending phase has changed.');
        }
        // Phase is finished. Let's remove it just before calling actual resolve function.
        // This is in case callback would create another promise etc. Such promise will expect that no pending phase is running.
        asyncData.pendingPhases.delete(phase);
        // Now let's re-inject parent reaction, so it'll be active one while fullfill callback is running
        var isResolveCallbackRunning = true;
        var removeInjectedReaction = allowInternal(function () {
            return injectReaction({
                reaction: callerReaction,
                // Mark it as 'alive' only during lifetime of this callback.
                getIsStillRunning: function () {
                    return isResolveCallbackRunning;
                },
            });
        });
        // Call actual callback and get it's result.
        // Mark injected reaction as not active anymore and return original result.
        try {
            return Reflect.apply(onFulfilled, _this, [result]);
        }
        catch (error) {
            if (onRejected) {
                Reflect.apply(onRejected, _this, [error]);
            }
            return Promise.reject(error);
        }
        finally {
            // Instantly after callback has finished - remove injected reaction
            isResolveCallbackRunning = false;
            removeInjectedReaction();
        }
    };
    // Call .then with wrapped callback instead of original one.
    return Reflect.apply(_originalThen, this, [wrappedOnFulfilled, onRejected]);
}
var didInject = false;
function injectReactivePromiseThen() {
    if (didInject) {
        return;
    }
    didInject = true;
    Promise.prototype.then = then;
}
var AsyncReactionCancelledError = /** @class */ (function (_super) {
    tslib.__extends(AsyncReactionCancelledError, _super);
    function AsyncReactionCancelledError(msg) {
        var _this = _super.call(this, msg) || this;
        _this.name = 'AsyncReactionCancelledError';
        return _this;
    }
    return AsyncReactionCancelledError;
}(Error));
function isAsyncReactionCancelledError(input) {
    return input && input.name === 'AsyncReactionCancelledError';
}

function watch(watchCallback, options) {
    if (options === void 0) { options = {}; }
    injectReactivePromiseThen();
    if (!options.name) {
        options.name = 'watch';
    }
    if (getRunningReaction() && !allowNestedWatchManager.isRunning()) {
        throw new Error('Cannot start nested watch without explicit call to allowNestedWatch. If you want to start watching inside other reaction, call it like `allowNestedWatch(() => { watch(callback) })`. Remember to stop nested watching when needed to avoid memory leaks.');
    }
    var existingReaction = getCallbackWrapperReaction(watchCallback);
    if (existingReaction && !isReactionErased(existingReaction)) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn("You're calling watch on callback that is already running. It will have no effect.");
        }
        return function unsubscribe() {
            eraseReaction(existingReaction);
        };
    }
    // This reaction exists, but was stopped. Reset it and start it again.
    if (existingReaction) {
        resetReaction(existingReaction);
        callWithReactionsStack(existingReaction, watchCallback);
        return function unsubscribe() {
            eraseReaction(existingReaction);
        };
    }
    // New reaction
    function reactionCallback() {
        if (isAsyncReaction(reactionCallback)) {
            cancelPendingPhasesIfNeeded(reactionCallback);
        }
        var callbackResult = callWithSuspense(function () {
            return callWithReactionsStack(reactionCallback, watchCallback);
        }, reactionCallback);
        if (callbackResult instanceof Promise) {
            markReactionAsAsync(reactionCallback);
            callbackResult
                .then(function () {
                assertNoPendingPhaseAfterReactionFinished(reactionCallback);
            })
                .catch(function (error) {
                if (isAsyncReactionCancelledError(error)) {
                    // This is expected.
                    return;
                }
                console.warn('Watch async function thrown an error', error);
                if (isResourcePromise(error)) {
                    console.warn("Sems you're calling async selector 'read' inside async watch function. Use .read only inside sync functions. In async functions, call 'selector.promise' instead.");
                    return;
                }
            });
        }
    }
    allowInternal(function () {
        registerReaction(reactionCallback, watchCallback, options);
    });
    reactionCallback();
    function stop() {
        eraseReaction(reactionCallback);
    }
    return stop;
}
function watchAllChanges(storePart, callback, options) {
    if (options === void 0) { options = {}; }
    injectReactivePromiseThen();
    if (options.name) {
        options.name = 'watchSelected';
    }
    if (!isStore(storePart)) {
        throw new Error('watchSelected input must be any part of the store');
    }
    if (isReaction(callback)) {
        throw new Error("Cannot call watchSelected multiple times with the same callback.");
    }
    allowInternal(function () {
        registerReaction(callback, callback, options);
    });
    var stop = registerSelectedAnyChangeReaction(storePart, callback);
    return stop;
}
var noop$1 = function () { };
function manualWatch(lazyWatcher, onWatchedChange, options) {
    if (onWatchedChange === void 0) { onWatchedChange = noop$1; }
    if (options === void 0) { options = {}; }
    injectReactivePromiseThen();
    if (!options.name) {
        options.name = 'manualWatch';
    }
    function reactionCallback() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (isReactionErased(reactionCallback)) {
            throw new Error("Cannot call lazyWatch callback after it has unsubscribed");
        }
        var result = callWithSuspense.apply(void 0, tslib.__spread([function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return callWithReactionsStack.apply(void 0, tslib.__spread([reactionCallback, lazyWatcher], args));
            }, reactionCallback], args));
        return result;
    }
    allowInternal(function () {
        registerReaction(reactionCallback, lazyWatcher, options);
        registerLazyReactionCallback(reactionCallback, onWatchedChange);
    });
    function stop() {
        eraseReaction(reactionCallback);
    }
    reactionCallback.stop = stop;
    return reactionCallback;
}

function selector(getter, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var updateStrategy = (_a = options.updateStrategy) !== null && _a !== void 0 ? _a : 'silent';
    var resource;
    var selectorValueStore = store({
        // We'll initialize this value on first run, but we don't want to read resource now if this selector
        // is lazy
        value: null,
        promise: null,
    });
    function initResourceIfNeeded() {
        if (resource) {
            return;
        }
        // We'll warn for eager reactions that reject without being called nor resolved before
        var didResolveAtLeastOnce = false;
        resource = singleValueResource(getter, {
            onStatusChange: function (status) {
                if (status.state === 'resolved') {
                    didResolveAtLeastOnce = true;
                    // Update store value skipping schedulers. It will be up to reactions watching this selector to schedule their updates properly.
                    sync(function () {
                        selectorValueStore.value = status.value;
                        selectorValueStore.promise = null;
                    });
                }
                if (status.state === 'updating') {
                    sync(function () {
                        selectorValueStore.promise = status.promise;
                    });
                    reactionsWatchingThisSelector.forEach(function (reaction) {
                        var _a, _b;
                        (_b = (_a = getReactionOptions(reaction)).onSilentUpdate) === null || _b === void 0 ? void 0 : _b.call(_a, status.promise);
                    });
                }
                if (status.state === 'rejected') {
                    // Lazy reactions are not called automatically so their error will be passed to caller.
                    if (options.lazy || didResolveAtLeastOnce) {
                        return;
                    }
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn("Selector rejected before being used with error:", status.error);
                    }
                }
            },
        });
    }
    var watching = null;
    function startWatchingIfNeeded() {
        if (watching) {
            return;
        }
        startWatching();
    }
    function startWatching() {
        if (watching) {
            throw new Error('Cannot start selector watching if its already watching');
        }
        initResourceIfNeeded();
        var stop = allowNestedWatch(function () {
            return watch(function () {
                if (updateStrategy === 'reset') {
                    resource.restart();
                    sync(function () {
                        selectorValueStore.value = null;
                    });
                }
                else {
                    resource.update();
                }
            }, { name: 'selectorWatch' });
        });
        watching = { stop: stop };
    }
    // Object of actual selector
    var selectorWrapper = {
        // value is readonly. When user tries to get it - it'll initialize resource and watching if needed.
        // it might also suspend.
        get value() {
            initResourceIfNeeded();
            var runningReaction = getRunningReaction();
            // If all of below conditions are true, we dont have to watch:
            if (
            // It cannot be already watching
            !watching &&
                // must be lazy
                options.lazy &&
                // It is not called inside other reaction
                !runningReaction &&
                // It is not requested to warm this selector.
                // If we're warming lazy selector - it will become warm until something starts to watch it and then stops.
                !warmingManager.isRunning()) {
                // Read from resource. It might suspend.
                resource.read();
                // Now we return value from the store. It is synced with resource because of onResolved callback
                // Added to resource that will instantly update store value before doing anything else after resolving
                return selectorValueStore.value;
            }
            // We'll read selected value with watching.
            startWatchingIfNeeded();
            // If this selector is lazy - watch if it is accessed during some other reaction.
            // If this is the case - we'll stop this selector watcher when all watching reactions that
            // access this reaction will stop.
            if (runningReaction) {
                handleNewReaction(runningReaction);
            }
            // Read resource in order to suspend it or throw if there is some error inside of it.
            resource.read();
            // Now we return value from the store. It is synced with resource because of onResolved callback
            // Added to resource that will instantly update store value before doing anything else after resolving
            return selectorValueStore.value;
        },
        // Selector value is readonly. Let's add setter to show proper error message.
        set value(value) {
            throw new Error("You cannot manually change the value of the selector.");
        },
        get promise() {
            return resource.promise();
        },
    };
    // If selector is not lazy - start watching instantly during creation.
    if (!options.lazy) {
        startWatchingIfNeeded();
        // Resource is already created by start watching.
        var status_1 = resource.getStatus();
        // If getter of the selector itself returned error - throw it and don't create selector
        if (status_1.state === 'getterError') {
            throw status_1.error;
        }
    }
    // In this section we're allowing lazy selector to stop itself if nothing is watching it anymore
    var reactionsWatchingThisSelector = new Set();
    function handleNewReaction(reaction) {
        // We've already did it for this reaction
        if (reactionsWatchingThisSelector.has(reaction)) {
            return;
        }
        // Register this reaction as watching this selector
        reactionsWatchingThisSelector.add(reaction);
        if (!options.lazy) {
            return;
        }
        // Add stop subscriber to this reaction
        subscribeToReactionStopped(reaction, function () {
            // Selector is already stopped. Do nothing.
            // Note such case should never happen as selector should not be stopped if something was watching it.
            if (!watching) {
                return;
            }
            // Remove reaction from list of selector watchers
            reactionsWatchingThisSelector.delete(reaction);
            // If it was the last reaction watching this selector - stop updating selected value
            if (reactionsWatchingThisSelector.size === 0) {
                watching.stop();
                watching = null;
            }
        });
    }
    return selectorWrapper;
}
function selectorFamily(getter, options) {
    var serializedArgsSelectorsMap = new Map();
    function getArgsSelector() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var serializedArgs = serialize(args);
        if (serializedArgsSelectorsMap.has(serializedArgs)) {
            return serializedArgsSelectorsMap.get(serializedArgs);
        }
        var argsSelector = selector(function () {
            return getter.apply(void 0, tslib.__spread(args));
        }, options);
        serializedArgsSelectorsMap.set(serializedArgs, argsSelector);
        return argsSelector;
    }
    function get() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return getArgsSelector.apply(void 0, tslib.__spread(args));
    }
    return get;
}

exports.addInjectReactionHook = addInjectReactionHook;
exports.allowInternal = allowInternal;
exports.allowNestedWatch = allowNestedWatch;
exports.assertStore = assertStore;
exports.asyncScheduler = asyncScheduler;
exports.batch = batch;
exports.createAsyncScheduler = createAsyncScheduler;
exports.dontWatch = dontWatch;
exports.getStoreRaw = getStoreRaw;
exports.injectReaction = injectReaction;
exports.isManualReaction = isManualReaction;
exports.isReaction = isReaction;
exports.isStore = isStore;
exports.manualWatch = manualWatch;
exports.registerReaction = registerReaction;
exports.selector = selector;
exports.selectorFamily = selectorFamily;
exports.setDefaultScheduler = setDefaultScheduler;
exports.store = store;
exports.sync = sync;
exports.syncEvery = syncEvery;
exports.syncScheduler = syncScheduler;
exports.waitForSchedulersToFlush = waitForSchedulersToFlush;
exports.warmSelectors = warmSelectors;
exports.watch = watch;
exports.watchAllChanges = watchAllChanges;
