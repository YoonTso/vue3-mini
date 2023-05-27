const bucket = new WeakMap();

const data = { foo: 1 };
let activeEffect;
const effectStack = [];

function effect(fn, options = {}) {
    const effectFn = () => {
        cleanup(effectFn);
        activeEffect = effectFn;
        effectStack.push(activeEffect);
        fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
    };
    effectFn.options = options;
    effectFn.deps = [];
    effectFn();
}

function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}

const obj = new Proxy(data, {
    get(target, key) {
        track(target, key);
        return target[key];
    },
    set(target, key, newVal) {
        target[key] = newVal;
        trigger(target, key);
    },
});

effect(
    () => {
        console.log(obj.foo);
    },
    {
        scheduler(fn) {
            setTimeout(fn);
        },
    }
);

obj.foo++;
console.log("结束了");

function track(target, key) {
    if (!activeEffect) return target[key];
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    const effectsToRun = new Set();
    effects &&
        effects.forEach((effectFn) => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn);
            }
        });
    effectsToRun.forEach((effectFn) => {
        if (effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn);
        } else {
            effectFn();
        }
    });
}
