# 基于canvas的视频遮罩插件

## 视频遮罩介绍

为一个视频添加一个覆盖物，从而挡住视频某区域，在视频的某一时间段，比如第10到第20分钟不显示划定的这块区域。应用场景包括**遮挡卫视图标**、**遮挡视频右下角广告**、**充当马赛克**等。

一个长视频可能包含多个遮罩，每个遮罩有特定的显示时间（在此时间外，隐藏该遮罩）。

## 前端实现视频遮罩

有**基于div**和**基于canvas**两种技术方案，本文是使用canvas完成的。

主要原理是在HTML的video标签上贴上一个透明的canvas图层，然后响应mousedown、mousemove、mouseup事件。
由于canvas事件只是基于canvas元素，所以canvas内部每个元素（一个矩形，一个圆等）的事件响应要利用坐标来自己代码完成。

## 插件GitHub地址

https://github.com/cunzaizhuyi/maskPlugin

## 查看演示

http://htmlpreview.github.io/?https://github.com/cunzaizhuyi/maskPlugin/blob/master/mask/mask.html

## 实现的功能点
* 画遮罩（矩形）
* 设置遮罩样式（提供API）
* 遮罩移动
* 遮罩缩放
* canvas上鼠标样式变换

## API

|名称|值类型|说明|
|--|--|--|
|**1、矩形相关设置**|||
|fillStyle|颜色值|矩形填充色, 默认为'#eeeeee'|
|strokeStyle|颜色值|矩形边界线颜色, 默认为'#0000ff'|
|inRectCursor|字符串|当鼠标处于某个小矩形内部时鼠标样式，默认为'move'。可以设置为'pointer'之类的。|
|**2、矩形边界上的八个小矩形 相关设置**|||
|bRectsStrokeStyle|颜色值|矩形边界上的小矩形的颜色，默认为'#0000ff'|
|bSideLength|number|矩形边界上小矩形的边长值，默认为6|
|**3、遮罩时间相关**|||
|masksTime||每个遮罩的开始显示时间和结束显示时间，一个遮罩对应一个矩形|

masksTime举例：
```
[{
    maskId: 1,
    startTime: 0,
    endTime: 10,
}, {maskId: 2,
    startTime: 3,
    endTime: 13,
}]
```
## 文件说明

有两个遮罩类，mask.js和mask2.js。
他们的区别是是否需要点击button才能生成一个新的遮罩。
其中，mask.js不需要，mask2.js需要每次点击按钮才能画新遮罩。

## 应用效果图

![](https://github.com/cunzaizhuyi/blog-assets/blob/master/nledit/mask2.png?raw=true)

## 最后

这个基于原生canvas的700多行的小插件，对于探索canvas的世界可能仅仅是一个开始。

关于这个小插件有任何疑问，欢迎大家交流。




