import {createApp, defineComponent, h} from "vue";
import type {SpinConfig, SpinInstance} from "./Type.ts";
import {Spin} from "antdv-next";
import {useThemeStore} from "@/stores/theme.ts";

/** @name 单例 **/
let singleInstance: SpinInstance | undefined = undefined;

/** @name 创建Spin组件 **/
export function createSpinComponent(options: SpinConfig) {
  // 全屏遮罩复用组件库 Spin 的 fullscreen 能力：mask 底色、淡入淡出、指示器居中由库承担；
  // 语义化 root 注入 z-index 与高级材质 blur（渲染函数内读 store，开关切换实时生效）
  const themeStore = useThemeStore();
  // 定义Spin组件的配置，defineComponent函数仅是在定义Vue组件时提供类型推导的辅助函数。
  const spinComponent = defineComponent({
    name: "Spin",
    setup() {
      // setup函数可以返回一个渲染函数
      return () => {
        const {target, ...spinProps} = options;
        return h(Spin, {
          ...spinProps,
          fullscreen: true,
          styles: {
            root: {
              zIndex: 2000,
              backdropFilter: themeStore.$state.groundGlass ? 'var(--lihua-backdrop-filter-sm)' : ''
            }
          }
        });
      };
    },
  });
  // 创建组件实例
  const spinInstance = createApp(spinComponent);
  // 将组件实例挂载在一个容器元素中，参数可以是一个实际的DOM元素或一个CSS选择器
  // 如果此组件有模板或渲染函数，它将替换容器内所有现存的DOM节点。
  const vm = spinInstance.mount(document.createElement("div"));

  function close() {
    // 移除文档流的DOM节点
    vm.$el?.parentNode?.removeChild(vm.$el);
    // 销毁组件实例
    spinInstance.unmount();
    // 单例销毁
    singleInstance = undefined;
  }

  return {
    close,
    get $el(): HTMLElement {
      return vm.$el;
    },
  };
}

/** @name 入口函数 **/
function service(options: SpinConfig = {}): SpinInstance {
  if (singleInstance) return singleInstance;
  const resolved = resolveOptions(options);
  const instance = createSpinComponent({
    ...resolved
  });
  // 将Spin组件插入文档流中
  (resolved.target! as HTMLElement).appendChild(instance.$el);
  singleInstance = instance
  return instance;
}

/** @name 配置预处理，主要处理额外扩展的target属性，target不传，则默认使用body作为挂载节点 **/
const resolveOptions = (options: SpinConfig): SpinConfig => {
  let target: HTMLElement;
  const isString = (val: unknown): val is string => typeof val === "string";
  if (isString(options.target)) {
    target = document.querySelector<HTMLElement>(options.target) ?? document.body;
  } else {
    target = options.target || document.body;
  }
  return {
    ...options,
    target
  };
};

export default {
  service,
};
