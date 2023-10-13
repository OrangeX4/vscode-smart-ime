![](./icon.png)

# Smart IME

灵感来自 idea 的 Smart Input，用于智能地进行中英输入法的切换。

依赖于 IME and Cursor 插件，所以请先进行该插件的配置，例如可以配置中文输入法时显示为红色光标。

## 依赖

需要安装 IME and Cursor 与 HyperScopes 插件。

## 特性

![](./smart-ime.gif)

- 在中文后输入一个空格自动切换到英文输入法（默认开启），在英文后输入两个空格自动切换到中文输入法（默认未开启）；
- 进入到注释场景时，自动切换为中文输入法，离开时自动切换为英文输入法（参考插件配置里的 `comment` 相关内容）；
- 进入到数学公式时，自动切换为英文输入法，离开时自动切换为中文输入法（参考插件配置里的 `markup.math` 相关内容）；

## 目前的问题

- VS Code 并没有给出一个很好的 api 来判断终端是否获得了焦点，因此切换到终端时切换到英文输入法的功能暂时无法实现；
- Commit Message 同理，暂时无法实现；
- Vim 模式的支持可以使用 IME and Cursor 里的配置实现；

## 插件设置

- `smart-ime.enableChineseAndSpaceSwitchToEnglish`: 检测到中文+空格时切换输入法到英文，默认开启
- `smart-ime.enableEnglishAndDoubleSpaceSwitchToChinese`: 检测到当前行前有中文，且光标前面是非中文+双空格时切换输入法到中文并删掉一个空格，默认关闭
- `smart-ime.enterScopesSwitchToChinese`: 进入某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `comment` 就可以实现进入注释块时切换到中文输入法的效果
- `smart-ime.enterScopesSwitchToEnglish`: 进入某些 scopes 时切换输入法到英文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `markup.math` 就可以实现进入数学公式时切换到英文输入法的效果
- `smart-ime.leaveScopesSwitchToChinese`: 离开某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `markup.math` 就可以实现离开数学公式时切换到英文输入法的效果
- `smart-ime.leaveScopesSwitchToEnglish`: 离开某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `comment` 就可以实现离开注释块时切换到英文输入法的效果
