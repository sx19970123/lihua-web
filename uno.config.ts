import {defineConfig, presetWind3} from 'unocss'
import {presetAntd} from '@antdv-next/unocss'

// antd 间距标尺中 16px 是无档位后缀的 token（--ant-padding / --ant-margin），
// @antdv-next/unocss 只提供带档位后缀的工具类（*-ant-xs/sm/md/lg/xl），这里补 -base 档指回无后缀变量
const spacingBaseProps: Record<string, string[]> = {
  p: ['padding'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  pr: ['padding-right'],
  m: ['margin'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  mr: ['margin-right'],
}

export default defineConfig({
  presets: [presetWind3(), presetAntd()],
  rules: [
    [/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-ant-base$/, ([, utility]) => {
      const props = spacingBaseProps[utility]
      if (!props) return
      const value = `var(--ant-${utility.startsWith('p') ? 'padding' : 'margin'})`
      return Object.fromEntries(props.map(prop => [prop, value]))
    }],
  ],
  autocomplete: {
    templates: ['p-ant-base', 'px-ant-base', 'm-ant-base', 'mx-ant-base'],
  },
})
