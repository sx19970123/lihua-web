---
name: lihua-web
description: 指导 lihua-web 仓（Vue 3 + Vite + antdv-next 管理端）的开发与验证。适用于 src/api 与 TypeScript 类型、页面与组件、路由与动态菜单、Pinia 状态、权限展示、字典、附件、表格、表单、UnoCSS 样式、主题，以及与 lihua / lihua-cloud 后端仓的契约对齐。
---

# 狸花猫 Web 管理端开发（lihua-web 仓）

处理本仓改动时使用。后端契约由兄弟仓承载：单体后端见 `lihua` 仓 `skills/lihua-backend.md`，微服务后端见 `lihua-cloud` 仓 `skills/lihua-cloud-backend.md`（跨仓不自动加载，涉及后端契约时打开对应文件）。移动端对应 `lihua-app` 仓。

## 代码地图

- 页面 `src/views/<domain>/<feature>/`；API `src/api/<domain>/<feature>/`（类型在对应 `type/`）；全局响应类型 `src/api/global/type.ts`。
- 组件 `src/components`；状态 `src/stores`（user / permission / setting / theme / dict / view-tabs）；静态路由 `src/router/index.ts`。
- 请求封装 `src/utils/request.ts`（`request<T>` / `blobRequest`）；环境 API 地址 `.env.development` / `.env.production`。
- **权限链路**：`src/permission.ts` 注册全局路由守卫（token、匿名访问、登录页跳转、403、WebSocket 连接、主题重置）；`src/app-init.ts` 是登录后应用初始化入口（用户信息、系统主题、动态路由、菜单、view-tabs、字典缓存、keep-alive 缓存）。动态路由和菜单主要由 `src/stores/permission.ts` 处理（含 `ROOT_PARENT_ID='0'` 树根常量出口，与后端 TreeUtils 同值约定）——变更菜单结构或路由元信息时要检查动态菜单与静态路由组合后的行为；多任务页签/缓存组件/最近访问由 `src/stores/view-tabs.ts` 管理。登录状态下首次进入页面连接 WebSocket；退出或 token 失效关闭连接并清空用户状态。主题初始化依赖用户信息中的主题配置，改动布局或主题时检查 theme store 与相关 layout 组件。
- **权限指令**：`v-hasRole`（`src/directive/has-role.ts`）、`v-hasPermission`（`src/directive/has-permission.ts`），参数必须是编码数组（如 `v-hasRole="['ROLE_admin']"`、`v-hasPermission="['system:user:save']"`）；指令在 mounted 阶段移除无权限 DOM，不能替代后端 `@PreAuthorize`。
- **图标唯一事实源** `src/components/icon/registry.ts`（eager 全量注册 + 分组名单出口）；第三方 svg 资产 `src/assets/icons/`（多色放 `fixed-color/`）；svgo 管线在 `vite.config.ts`（svgo 版本由 package.json `overrides` 统一）。
- 样式基建 `uno.config.ts`；全局样式 `src/static/css/`（index / custom / overwrite-ant / variable / ant-token-reference）。
- 上传/附件类型与组件值出口统一 `@/antd-adapter`（`index.ts` 值出口 + `types.ts` 类型出口，含 `UploadRequestOption`、`TableColumnsType`、`Upload.LIST_IGNORE` 等）。

## 核心规则

1. API 函数放 `src/api/<domain>/<feature>/`，类型放对应 `type/`；返回 `request<T>(...)` 或 `blobRequest(...)`；分页响应用 `PageResponseType<T>`、普通响应 `ResponseType<T>`；URL、HTTP 方法、请求体和响应泛型必须与后端 Controller 精确对齐；Excel 导出/文件下载/模板下载用 `blobRequest`；上传接口在 API 函数内构造 `FormData` 并按现有写法设置 multipart headers。
2. 页面放 `src/views/<domain>/<feature>/`；页面组件名全局唯一（领域+功能大驼峰），保证 keep-alive 行为可靠；表格查询、弹窗/抽屉、保存流程、导入导出、状态切换优先参考附近 `src/views/system/*`、`src/views/monitor/*` 页面模式。
3. 页面与抽屉/弹窗子组件的状态用 init 工厂模式组织（见下节）。
4. 新增组件前先复用 `src/components` 已有组件（附件上传、字典标签、图标选择、用户选择、表格设置、富文本编辑器、图片裁剪、树选择等）；只有多个功能复用才进全局组件目录，只服务当前功能的组件靠近页面放。
5. 跨页面状态用 `src/stores`；局部表单/表格状态不进全局。用户身份、角色、权限、部门、岗位、菜单、页签信息来自 user store。
6. 字典展示用字典工具和 `dict-tag`，不硬编码标签或颜色，由后端字典控制。
7. **antdv-next 的 API 禁止猜测**（铁律见下节）。
8. 交互层级禁止层上层（红线见下）。
9. **没有特殊样式需求不手写 CSS**：样式默认用组件库能力与 UnoCSS 工具类表达（四层优先级见「样式规范」），手写 CSS 仅限复杂选择器、伪元素、keyframes、运行时动态值。
10. **优先组件库组件，优先用库自身的 props/emits/slots 解决**——能用库能力的不自造（自绘控件、手拼 class 复刻库 DOM 都是破窗）；**确需覆盖组件库样式时先向用户提出确认**，不擅自覆盖。
11. **保持系统风格统一**：新 UI 落笔前先找同类页面/组件先例，照其结构、交互形态与样式档位写，不引入第二套风格。
12. **自定义公共组件必须对齐主题体系**：颜色/圆角/间距/阴影一律消费 `var(--ant-*)` token——圆角等外观属性用户可在个人中心调整（themeConfig token 运行时注入）、暗色经 algorithm 重写 token，消费 token 即自动跟随（机制见「样式规范」）；禁止硬编码色值/圆角/间距。

## antdv-next API 核实铁律

使用 antdv-next 的任何 prop / 导出 / DOM 行为前必须核实，禁止凭记忆或类比猜测。核实顺序：

1. **`node_modules/antdv-next/dist/<组件>/` 源码——唯一事实源**：prop 是否存在与默认值查 `toPropsRefs(...)` / props 定义块；class/style 是否落根 DOM 查渲染函数 `attrs.class` 合并链；自定义样式覆盖不生效查 `dist/<组件>/style/index.js` 的选择器与特异性（cssinjs 运行时注入晚于所有静态样式，同特异性静态规则必输——a-select 表单内宽度、菜单边框只能内联 style 即此因）；类型与导出查主入口 `index.d.ts`。
2. **antd React 官方文档作旁证**：vnext 与 antd v5/v6 高度对齐，React 文档有而 vnext 文档漏列的 prop 大概率实际存在（如 Modal `focusTriggerAfterClose`）。
3. antdv-next 官网只作参考不作依据（SPA 文档抓不全且存在漏列）。

拿不准组件行为时，可用 jsdom + `@vue/test-utils` 挂载最小用例输出 `wrapper.html()` 验证（两个包都在 devDependencies），比开浏览器快。

## 页面状态：init 工厂模式

一个关注点一个 `initXxx()` 工厂：类型定义、状态（ref/字段）、方法、watch 声明在工厂内，`return` 导出，setup 顶层解构消费；跨工厂依赖经顶层解构名引用（后声明的工厂可用先解构的变量）。**粒度 = 「一类操作或业务」一个工厂**：同一业务的多个操作合并一个工厂（发布/下线同属状态管理 → 一个 init 收多个 handler），不按方法逐个拆；有状态的业务（涉及 ref、字段属性）必须 init，无状态的简单操作同样按 init 组织（顶层不出现散装业务函数，后续复杂化时状态有处可收）。样板：`SystemRole.vue`、`dict/dictData/index.vue`、`SystemAppVersion.vue`（initSearch / initDetailView / initSave / initStatusAction / initDelete 五工厂，setup 顶层仅 initDict 与解构消费）。个别场景的「工厂拍平」是单场景优化决策，不是规范，勿效仿。

## 契约与范式

### 字典

`initDict(...codes)` 返回 **store 溯源的 computed**（只读，勿对其赋值）——store 更新即时反映到全部消费页；强制刷新某字典调 `reLoadDict(code)`（写 store 全站生效）；并发去重与「未加载/已加载无选项」区分由 `ensureDicts`/`hasDict` 内部处理；登出与刷新缓存场景的 store 清理/原地重载已机制化，页面层勿手写缓存刷新逻辑。TypeScript 中注意响应式 ref 的 `.value`。

### 请求错误处理

- 拦截器统一提示后抛 `ResponseError`——调用点**只写 `try/finally` 复位 loading，不写 catch**（未 catch 的拒绝进 console 属可接受噪音，无全局兜底静默）；需区分错误分支时 `catch (e) { if (e instanceof ResponseError) ... }`；表单保存的 `validate()` 用 `.then(() => true).catch(() => false)` 静默守卫（校验错误由表单内联展示）。
- **业务码提示责任边界**：拦截器只提示 401 / 407 / HTTP 状态码层错误 / 无响应四类，**HTTP 200 + 业务码非 200（500/507 等）不提示**——调用点 `resp.code !== 200` 分支必须自行 `message.error(resp.msg)`。
- **弹窗防刷屏**用 `src/utils/window-guard.ts` 的 `createWindowGuard(ms)`（按键前沿节流、窗口自动复位，勿改回布尔标志——布尔不复位会永久吞掉下一次真实触发）：①拦截器提示走 `notifyRequestError`（同文案 3s 窗，后端挂时并发失败只弹一条）；HTTP 状态码错误分支=代理/网关/服务器层错误（HTML/空体）——错误体带 `msg` 则透传（防御），否则统一「服务暂时不可用」（413 例外提示上传体过大），勿再按 404/500/502 编文案；无响应分支区分超时/网络异常。②401 联动（清用户态+跳转+提示）在 `stores/user.ts` `authenticationFailure` 用 5s 单飞窗；超时判定用常量 `AxiosError.ECONNABORTED`。
- **`MapResponseType<string, T>` 语义**：接口体是索引签名 `[key: string]: V[]`——`V` 是值的数组元素类型（`MapResponseType<string, SysPost>` = `Record<string, SysPost[]>`），第一个泛型参数未使用；对应后端 `Map<String, List<T>>` 写 `MapResponseType<string, T>` 即可，勿改成嵌套数组。

### antdv-next 组件契约

- **表单 name 补齐判据**：vnext 的 form 仅收集/校验显式 `name` 的 form-item，但判据是「是否依赖表单收集通道」——页面数据走 v-model 直连 DTO、提交用 DTO 本体（无 `getFieldsValue`/`validateFields`）且 rules 涉及字段均已具名时，其余无 name 项（纯布局、radio/textarea 直连控件）不需补；检索区表单连 `:model` 都没有时更不适用。补 name 前先查提交链路怎么取数。
- **表单弹窗必须 `destroy-on-hidden`**：a-modal 内含带 `:rules` 的 a-form 时一律加——否则表单实例与校验状态跨开关残留，「编辑回填 → 关闭 → 新增」时 resetForm 程序赋空值触发 change 校验，必填字段误显校验错误。resetForm 内补 `clearValidate()`（含 nextTick 异步版）实测无效，销毁重建才是根治；数据模型声明在 setup 层不随弹窗销毁，resetForm 数据重置仍必要；无 rules 的纯展示弹窗不需要。排查同类问题按「a-modal × `:rules=` × `destroy-on-hidden`」三元组全目录扫描（grep 单页易被搜索表单命中占满而漏判编辑弹窗）。
- **change 事件消费首参**：各组件（Switch/Select/Slider 同族）change 事件可能先于 v-model 写回，`@change` handler 内读绑定值有时序旧值风险——统一消费 **change 首参新值**（方法引用 `@change="fn"` 首参自动传入，改方法签名接参即可）；考虑 watch 化前必须先查编程式赋值是否会误触发。
- **a-descriptions**：`labelStyle` prop 已移除（静默失效），改语义化 `:styles="{label: {…}}"`（语义键 root/header/title/extra/label/content）；`bordered` 仍有效。
- **a-card 边框机制**：默认 variant 挂 `-bordered` 类走**真实 border**（内联 `border:'none'` 可压除）；boxShadow 伪边框仅 `variant="borderless"` 存在（配 `box-shadow:none` 内联）——两种压法勿混用。**列表页既定视觉=全套带边框**：搜索卡 `<a-card :styles="{body:{'padding-bottom':'0'}}">`（默认边框）+ 表格卡 `<a-card :styles="{body:{padding:0}}">` 包 a-table（card 边框成框，#title 工具栏与 #footer 分页含框内，表格与卡同底色无缝）；边框色/圆角对齐 card token：`var(--ant-line-width) var(--ant-line-type) var(--ant-color-border-secondary)` + `var(--ant-border-radius-lg)`。
- **steps 型 a-progress 宽度契约**：`:steps` 步进进度条总宽 = **段宽 × steps 数 + 间隙 × (steps-1)**（每道 2px）；配固定宽容器按此预算，超宽顶出横向滚动条。
- **TableColumnsType 必带行类型泛型**：列声明用 `@/antd-adapter` 的 `TableColumnsType` 且列内含强类型 `sorter: (a: T, b: T) => number` 时必须写 `TableColumnsType<T>`——缺省泛型为 AnyObject，sorter 参数逆变不兼容直接编译报错。
- **横向 a-flex 放大内容子项必须 wrap + flex-1 min-w**：a-flex 默认 nowrap，卡片等块级子项按内容取宽且 `min-width:auto` 不可收缩——子项最小宽之和超容器时整行向右溢出被裁切（外层 overflow 掩盖、无控制台告警、静态 type-check 不可见）。范式：`<a-flex :gap="16" wrap="wrap">` + 卡片 `class="flex-1 min-w-[300px]"`；不可 flex-1 的定宽内容子项（如图片）防溢出用 `wrap="wrap"` + 子项 `w-[Npx] max-w-full`；图标+文本行给图标 `size-N shrink-0` 防挤压。
- **Upload 组件**：值（含 `Upload.LIST_IGNORE`，beforeUpload 拒收用）经 `@/antd-adapter` 统一导出，勿 import 旧包；上传文件类型出口用 `UploadRequestOption['file']`（旧 RcFile 在 vnext 生态不存在）。`#previewIcon`/`#removeIcon`/`#downloadIcon` 等动作图标插槽**只返回裸图标 vnode**——vnext UploadList 的 `actionIconRender` 会把插槽内容包进它自己的动作按钮，插槽里再放 a-button 会按钮嵌按钮，手拼 `ant-btn-*`/`anticon-*` 类是无意义 DOM 复刻。**动作图标外包 Popconfirm 不可行**（`actionIconRender` 对 vnode 执行 `cloneVNode(icon, {onClick: void 0})` 塞进 Button 的 icon prop，按钮 handleClick 无条件先执行内置回调、图标上的 `@click.stop` 被抹除——双重触发无解）；改删除确认形态的正确入口是 **`itemRender` 插槽**：透传第四参 `actions`（`actions.remove(file)` 为内置完整删除链句柄——beforeRemove → fileList 维护 → uploading abort 全保留），自绘按钮包 popconfirm 后 `@confirm` 调它即可。
- **a-upload 禁 `:action` 直传**：上传一律 `:custom-request` 走 axios 管线（`UploadRequestOption` 类型自 `@/antd-adapter`，`options.onSuccess?.(resp, file)` 把响应挂到 file.response 供 change/handleModelValue 统一消费）——凭证/拦截器/错误提示全站统一；`:headers`/`:data`/手拼 uploadURL 直发形态退役。数量配额由 beforeUpload 判定 + exceed 事件，不透传 `:max-count`（vnext maxCount 是静默截断语义、无超量事件）。**判定基数**：不能直接用 beforeUpload 第二参 `currentFileList.length`（本批全量——一次多选时批内每个文件都看到整批长度，超量整批误拒；跨批次又漏掉已传文件）——正确基数 = `fileList` 已跟踪数 + 本批已接受未入列在途计数（uid Set，change 回调对账移除）；也不能用 `indexOf(file)` 位置简化（批内被类型/大小先拒的文件会错误占位）。
- **blob URL 共享所有权**：经 v-model 传递的 blob URL 由**创建者跟踪自有值**——子组件在「被替换/被删除」时 revoke、「卸载」**不**释放（父组件会把持有的值回传给重建实例）；父组件持有方在「新确认替换旧预览」「放弃编辑还原」时释放、「确认成功」**不**释放（父级展示仍在消费）；页面级卸载统一释放安全（父子同亡）。样板：image-cropper（子侧）、AvatarModifier（父侧）。
- **组件级 composables 抽取**：大组件按「现成工厂边界」拆到组件目录 `composables/`（对齐 view-tabs 先例，勿建全局 hooks 目录）——共享产物（fileList/emits/buildXxx/状态机）收敛为上下文参数对象传入；composable 间循环依赖用**晚绑定注册**（先建 core，依赖其回调的一方后建，`core.bindXxx(api)` 注入）消除 TDZ 依赖；对外可见状态（loading/阶段/进度）合并**单 reactive** 由上下文共享。跨组件不共用的逻辑不进全局目录。
- **defineEmits 一律类型化元组签名**：`defineEmits<{ 事件名: [参数类型, ...] }>()` + 逐事件用途注释，禁用字符串数组形式——类型化会暴露无类型声明掩盖的载荷不一致；同一事件多种载荷形态按现状标联合类型并注释区分。

### 附件与头像

- **附件 URL 消费统一出口**：后端下发的 entry 链接（上传 VO.url / info url / avatar JSON 的 image value / 下载签发链接）页面消费一律 `resolveAttachmentEntryUrl`（`VITE_APP_BASE_API` 部署前缀拼接，唯一出口）；脱离页面上下文的外发场景（剪贴板分享等）用 `resolveAttachmentAbsoluteUrl`（origin + entry）——均从 `src/api/system/attachment/attachment-storage.ts` 导出。**禁止以 env 常量拼附件 URL 或 fetch 转 blob URL 存展示态**（缓存交下载端 Cache-Control；判「已加前缀」的 startsWith 探测守卫不算拼装）。
- **头像单字段契约**：凡下发头像的响应，`avatar` 单字段 JSON 内 **image 型 value 即后端拼好的访问链**（text/icon 原样；入库恒为对象键）——`user-avatar` 组件只收一个 `avatarJson` prop，json 解析与 image 链前缀拼接在组件内部完成（blob:/http 预览地址直用）；前端不得再建任何「键→URL」拼装函数。组件 v-model 逗号串契约封装见 `attachment-upload/composables/model-value.ts`（split/join 单点收口）。
- **头像背景色**：avatar JSON 的 backgroundColor 持久化**语义值**——`AVATAR_AUTO_BACKGROUND = 'auto'`（跟随系统主题色）或纯色（rgb()/rgba()/#hex）；渐变等展示形态只作 color-select 色卡的 `displayColor`（值/展示分离），不入库。渲染与预览统一走 `helpers/avatar.ts` 的 `resolveAvatarBackgroundColor(background, colorPrimary)`：auto 与非法值（含历史渐变串）→ 主题色兜底、合法纯色→原值（无存量兼容——判不了就随主题，勿加渐变串解释分支）。**禁用 `startsWith/includes('conic-gradient')` 前缀判「跟随系统」**；user-avatar 消费形态 = computed（读 store 响应态，主题切换实时生效，勿回退 ref+watch 手动同步）；color-select 开 `allowCustom` 的场景**必须传 `custom-color-storage-key`**（自定义色记忆存 localStorage，共享键会跨场景相互覆盖；漏传组件加载即 `console.error`）。

### 路由与页面

- 静态路由在 `src/router/index.ts`；大多数业务菜单通过后端菜单系统动态配置，普通管理页面勿随意新增静态路由（除非已有同类模式）。静态路由 `meta` 支持标题、图标、显示隐藏、页签、缓存、链接行为、匿名访问和角色限制；`meta.cache: true` 时路由必须有稳定唯一 `name`，组件名同步唯一；角色限制用 `ROLE_admin` 等角色编码，无权限用户进入现有 403 行为。
- **孪生页 tab 参数模式**：左菜单+右内容卡片的页面用 `?tab=` 保刷新位置——菜单 key / 组件注册名 / tab 参数三者同名；`watch(() => route.query.tab, {immediate: true})` 还原卡片，query 缺失/非法时 `router.replace({query: {...route.query, tab: 默认}})` 补规范值（replace 不留历史；补写后 watch 以合法值重触发，不会循环）；菜单点击 replace 同步 URL；handler 加 `if (!target) return` 空守卫。样板：SystemProfile、SystemSetting。
- **keep-alive include 按组件名匹配**：`layout/content` 的 `<keep-alive :include>` 匹配 **script setup 文件名推断的组件名**——首页常驻缓存靠恒推 `'index'`（`views/index/index.vue` 文件名推断），**改名/加 defineOptions name 会静默打断首页常驻缓存**。
- **树根常量 ROOT_PARENT_ID**：树形数据「根节点父级标识 `'0'`」的前端唯一出口是 `stores/permission.ts` 导出的 `ROOT_PARENT_ID`（与后端 `TreeUtils.ROOT_PARENT_ID` 同值约定，改值须双侧同步）；树根语义消费点（顶级菜单判定、新建默认父级、表单树虚拟根等）一律用常量勿写字面量——注意与状态字典值的 `'0'`（visible/cache/status 等）区分。

### 图标

官方 `@antdv-next/icons` 已全局注册，模板直接用字符串名渲染（`<component :is="名字">`、`h(Icon, {icon: '名字'})`），无需 import；新增第三方图标 = svg 放入 `src/assets/icons/`（**文件名即全局组件名**，扁平命名勿与官方导出名撞名——registry 会在 dev 环境告警；多色放 `fixed-color/` 保留原色），用法与官方一致，**禁止手工 import 单个 svg 或另建机制**；单色图标构建期由 svgo 管线自动处理为 currentColor + 1em + anticon 类（颜色随 CSS、尺寸随 font-size）。菜单 icon、头像 JSON、页签等存储的都是图标名字符串，渲染统一走全局注册；图标选择场景用 `icon-select` 组件。改图标机制先看 `registry.ts` 与 `vite.config.ts` 的 svgo 管线。

## 样式规范（UnoCSS 与主题 token）

四层优先级：**antdv-next 组件 > 自定义组件 + UnoCSS 工具类 > 纯 UnoCSS 工具类 > 手写 CSS**（SFC `<style>`/全局 css 仅在工具类表达不了时用：复杂选择器、伪元素、keyframes、运行时动态值）。

- **基建事实**：`uno.config.ts` = `presetWind3() + presetAntd()` + 本项目补丁规则 `*-ant-base`（antd 的 16px 间距是无后缀 token `--ant-padding`/`--ant-margin`，preset 只生成带档位名字，补 `-base` 指回）。入口 `src/main.ts` 顺序 `reset.css → virtual:uno.css → index.css` 不可乱。preset 选项全默认（prefix='a'、tokenPrefix='ant'），裸写法也能解析但**统一约定命名空间写法 `*-ant-*`**。工具类是编译期产物，值指向的 `--ant-*` 变量由 antdv-next 运行时注入（cssinjs，作用域类 `.css-var-root`）——改 themeConfig token / 切暗色 algorithm 后变量重写，所有工具类与 `var(--ant-*)` 引用自动跟随，无需编译。
- **token 档位速查**（antd 默认值）：间距 `p/m…-ant-xxs/xs/sm/base/md/lg/xl`（margin 另有 xxl）= 4/8/12/16/20/24/32（/48）px；圆角 `rounded-ant-xs/sm/（无后缀）/lg` = 2/4/6/8px（更大圆角无 token，用任意值如 `rd-[24px]`）；字号 `text-ant-sm/（无后缀）/lg/xl` = 12/14/16/20px（18px 无 token）；阴影 `shadow-ant-ter`（卡片档=a-card 默认）/ `shadow-ant-secondary`（弹层档）；语义色 `bg-ant-success`（antd 叫 error 不叫 danger）、`bg-ant-error/primary/layout/container/elevated`、`border-ant-border` 等——全部跟随主题/暗色自动。
- **写法坑位**：文字色没有 `text-ant-*`（`text-*` 是字号规则），用 `c-ant-primary`/`c-ant-success`；**`border` 类只输出 `border-width:1px` 且本项目 preflight 无全局 `border-style:solid`——边框必须三件套 `border border-solid border-ant-border`**（只写 `border` 边框不渲染，`border-[1px_solid_颜色]` shorthand 也解析不出）；裸 `border-ant` 是主题色不是边框色（边框色必须写全 `border-ant-border`）；`text-secondary` 不存在（字号撞名），二级文字用 `c-ant-text-secondary`；wind 原生数字刻度（`p-4`=1rem、`gap-4`、`w-*` 等）照常可用但值是编译期常量不跟主题，仅用于布局——需要跟随主题的一律用 `-ant-*` 档位。
- **两条消费通道**：模板→工具类；CSS 文件/SFC style/TS 内联字符串→直接 `var(--ant-*)`（变量名与工具类档位同名：margin 族用 `--ant-margin-*`、padding 族用 `--ant-padding-*`；width/height/offset 等非间距语义用字面量 px）。新消费了未登记的 `--ant-*` 变量时同步补进 `src/static/css/ant-token-reference.css`（仅供 IDE 解析，不进构建）。
- **自定义公共组件的主题对齐（个人中心可调外观）**：圆角等外观属性是**用户可调的运行时 token**——`stores/theme.ts` 的 `themeConfig.token.borderRadius` 经 App.vue 的 ConfigProvider 注入全站，设置页改值后所有组件即时跟随（暗色同理：algorithm 重写 token）。自定义组件的圆角/间距/色值/阴影必须消费 `var(--ant-*)`（如 `var(--ant-border-radius)`），禁止写死；组件的暗色支持 = 消费 token 即自动获得，写死即破。
- **工具类与项目 CSS 同属性竞争时必输**：`virtual:uno.css` 在 main.ts 中先于 `static/css/index.css` 导入，同特异性 (0,1,0) 下后到的项目规则反杀（如 `.scrollbar` 的 overflow 简写能吃掉 `overflow-x-hidden` 工具类）——需要压过项目全局类的属性**一律走 scoped 规则**（`.x[data-v]` = (0,2,0)，与加载顺序无关）。
- **自有变量白名单**（`static/css/variable.css`）：玻璃材质（`--lihua-backdrop-filter-sm/md/lg` + on/off 色）、alpha 遮罩（`--lihua-alpha-0/2/4/5/6`）、布局常量（`--lihua-layout-height/head-space`、`--lihua-sider-dark-color`）、滚动条双色、运行时状态高度（`--footer-height`、`--{footer,tab,layout}-display-height`）、页面底色 `--lihua-background-color-level-1`。**禁止新增 antd 已有等价 token 的变量**（颜色/间距/圆角/字号/阴影/背景全部有 token）。
- **`--ant-*` 变量 JS 挂载后才注入**：index.html 等预渲染位置不可引用，只能用静态自有变量或字面量；渲染在 ConfigProvider 子树之外的游离 DOM（如挂在 body 下的 nprogress）拿不到 `--ant-*`，走 `--colorPrimary` 双通道机制（themeStore.changeDocumentElement 直写）。ConfigProvider 之外禁止 `useToken()` 取色（根级拿到的是库默认 token）；模板响应式取主题色用 `themeStore.getColorPrimary()`。
- **跨页面共用的 antd 覆盖样式必须进 `static/css/overwrite-ant.css`**——组件 `<style>`（即使非 scoped）随组件模块加载注入，未访问过该组件页面的会话中不生效。

## 红线与已否决方案

- **antdv-next API 禁止猜测**（核实流程见铁律节）。
- **禁止层上层**：抽屉已是独立层，不得从抽屉内再打开任何弹窗（modal/popconfirm 弹层除外——popconfirm 属轻量确认非层）；抽屉内需要「选择/编辑」类交互时用抽屉内视图切换、内联展开等形态。新建弹窗入口只允许挂在页面层级。
- **层叠上下文与 fixed 弹窗**：页面内 fixed 弹窗（如验证码 z-1001）要与 body 级元素（Teleport 蒙版 z-1000）比层级时，**从弹窗到 body 的祖先链不得出现任何层叠上下文**——z-index（哪怕内容层压背景用的 z-1）、isolate、transform、will-change、filter 都会把弹窗困在页面内被蒙版盖住。装饰背景压底的正解：背景 z-index:0 + 内容层**纯 relative（不带 z-index）**靠 DOM 顺序覆盖。连带：给容器加 relative 会劫持其内部 absolute 元素的定位基准（absolute 元素的定位基准要跟着 relative 的归属走）。勿用 Teleport 迁三方弹窗修层叠（样式环境破坏，已回退）。
- **页面滚动架构与弹层滚动锁**：页面滚动 = OverlayScrollbars 接管 body、html 为托管视口（`data-overlayscrollbars-viewport` 属性——样式表里的 `-body` 变体属性运行时不会出现，选择器勿照样式表想当然）。antd 弹层（Modal/Drawer/图片预览等挂 body 容器者）的滚动锁是 head 动态样式标签 `html body { overflow-y: hidden }`，标记为 `setAttribute('vc-util-key', key)` 的**裸属性（无 `data-` 前缀）**——检测用 `style[vc-util-key^="vc-util-locker"]`，写成 `data-vc-util-key` 会永久假阴性。OS 接管使 body→视口 overflow 传播链断，锁落在 body 盒子叠加 reset 的 `height:100%` 会塌缩滚动高度钳 0 scrollTop（开弹层跳顶）。现行方案：`custom.css` 反杀 `html body { overflow: visible !important }`（永不塌缩；**两轴齐钉**，单钉 y 会因 x 轴 hidden 规范降级 auto 使 body 变滚动容器）+ `utils/scrollbar.ts` 镜像桥接把锁落到 OS 视口 overflow 通道（html 级 hidden，位置天然保留）。**勿动 body 高度**（`.layout-content` 高度链依赖）；自定义为容器挂载的弹层（可展开卡片等）不触发锁。
- **`src/assets/icons/` 下的 svg 一律不可按静态引用判死**：registry 用 `import.meta.glob('@/assets/icons/**/*.svg')` 全量注册，icon-select 的可选清单来自 registry 的 `iconGroups`——每个 svg 都是图标选择器的「可选产品」（菜单/按钮图标等运行时选用），静态引用为零 ≠ 死资产。判死 svg 只适用于 assets/icons 之外的路径（如 views/*/static，需全库 grep 文件名零命中）。
- **弃用 API 的 grep 残留须甄别绑定目标**：`:body-style` 等弃用写法的命中点若落在**项目自有组件**上，先查该组件 props 是否显式声明同名自有 prop（自有组件内部已转 `:styles` 喂 a-card 的属合法用法）——照字面改成 `:styles` 反而 prop 失联走默认值。扫描弃用 API 时先看标签是 antd 组件还是自有组件。
- **通用工具能力优先用已装依赖，不手搓**：防抖/节流/深拷贝等先查项目已装包（`lodash-es` 的 debounce/throttle/cloneDeep），有则直接使用——手搓 `clearTimeout+setTimeout` 一律替换；语义化 API 是附带收益（debounce 实例自带 `flush()/cancel()`）。类型细节：`DebouncedFunc` 是 namespace 导出不能 `import type`，用 `ReturnType<typeof debounce>` 推断。

## 验证

- `npm run type-check`（vue-tsc --build --force）验证类型；较大的 UI、路由、环境或依赖变更后 `npm run build` 验证生产打包。
- 需要后端接口做手动验证但后端未运行时，至少完成类型/构建验证，并说明运行时验证缺口。
