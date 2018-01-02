/**
 * Copyright 2017 Qiyi Inc. All rights reserved.
 *
 * @file:   mask.js
 * @path:   mask.js
 * @desc:   画矩形遮罩
 * @date:  20180102
 */

class Mask{
    constructor(el, choiceEl){
        // 要画遮罩的元素，要求是个canvas
        this.canvas = el || null;
        this.canvas.width = parseInt(window.getComputedStyle(this.canvas).width);
        this.canvas.height = parseInt(window.getComputedStyle(this.canvas).height);
        this.choiceEl = choiceEl;
        this.choiceElWidth = parseInt(window.getComputedStyle(this.choiceEl).width);
        
        // canvas绘图环境
        this.ctx = this.canvas.getContext('2d') || null;
        let ctx = this.ctx;
        ctx.fillStyle = "#eeeeee";
        ctx.strokeStyle = "#0000ff";
        
        // 数据
        this.origin = [0, 0];
        this.wh = [0, 0];
        
        this.todo = '';
        this.toMoveIndex = -1;
        this.toScaleIndex = -1;
        this.isMouseDown = false;
        this.activeIndex = -1;
        
        this.rects = [/*{
         id: 1,
         coord:[x,y,w,h],
         }*/];
        this.maskId = 0;
        
        // 遮罩选择div
        this.choiceDiv = document.getElementsByClassName('choice')[0];
        this.choiceDiv.style.display = 'none';
        
        // 监听事件
        //this.initEvent();
    }
    
    // -------------------------------事件处理---------------------------------------
    
    initEvent(){
        // 注册监听器
        this.mousedownHandler2 = this.mousedownHandler.bind(this);
        this.mousemoveHandler2 = this.mousemoveHandler.bind(this);
        this.mouseupHandler2 = this.mouseupHandler.bind(this);
        
        this.canvas.addEventListener("mousedown", this.mousedownHandler2);
        this.canvas.addEventListener("mousemove", this.mousemoveHandler2);
        this.canvas.addEventListener("mouseup", this.mouseupHandler2);
        
        this.choiceDiv.addEventListener("click", this.choiceHandler.bind(this));
    }
    
    enableDrawMask(){
        this.initEvent();
    }
    
    /**
     * 禁止canvas上的一切事件，目前共三种
     */
    disableDrawMask(){
        
        this.canvas.removeEventListener("mousedown", this.mousedownHandler2);
        this.canvas.removeEventListener("mousemove", this.mousemoveHandler2);
        this.canvas.removeEventListener("mouseup", this.mouseupHandler2);
    }
    
    /**
     * 鼠标按下，必触发新建矩形、移动矩形、缩放矩形 三种行为中的某一种
     * @param e
     */
    mousedownHandler(e){
        this.isMouseDown = true;
        this.origin = [e.offsetX, e.offsetY];
        
        // 重置三种可能的用户交互动作 标记
        this.reset3action();
        // 判断是 准备移动、缩放、新建 一个矩形 的哪种情况
        for(let i = 0; i < this.rects.length; i++){
            if(this.isPointInRect(this.origin, this.rects[i].coord)){
                this.todo = 'move';
                this.toMoveIndex = i;
            }
            if(this.isPointOnBoundary(this.origin, this.rects[i].coord)){
                this.todo = 'scale';
                this.toScaleIndex = i;
            }
        }
        if(this.todo !== 'scale' && this.todo !== 'move'){
            this.todo = 'new';
        }
    }
    
    /**
     * 鼠标移动，必触发新建矩形、移动矩形、缩放矩形三种行为中的某一种
     * @param e
     */
    mousemoveHandler(e){
        if(!this.isMouseDown){
            return;
        }
        
        let end = [e.offsetX, e.offsetY];
        this.wh = [end[0] - this.origin[0], end[1] - this.origin[1]];
        
        let rectCoord = [...this.origin, ...this.wh];
        switch (this.todo){
            case "move":
                this.moveRectMMoveHandler(this.toMoveIndex, rectCoord);
                break;
            case "scale":
                this.scaleRectMMoveHandler(this.toScaleIndex, rectCoord);
                break;
            case "new":
                this.drawRectMMoveHandler(rectCoord);
                break;
        }
        this.choiceDiv.style.display = 'none';
    }
    
    /**
     * 鼠标弹起事件，停止移动、缩放、新建矩形
     * @param e
     */
    mouseupHandler(e){
        this.isMouseDown = false;
        
        let end = [e.offsetX, e.offsetY];
        this.wh = [end[0] - this.origin[0], end[1] - this.origin[1]];
        
        // 确定是三种行为中的哪一种引起的鼠标弹起
        let rectCoord = [...this.origin, ...this.wh];
        switch (this.todo){
            case "move":
                this.moveRectMUpHandler(this.toMoveIndex, rectCoord);
                this.activeIndex = this.toMoveIndex;
                break;
            case "scale":
                this.scaleRectMUpHandler(this.toScaleIndex, rectCoord);
                this.activeIndex = this.toScaleIndex;
                break;
            case "new":
                this.drawRectMUpHandler(rectCoord);
                this.activeIndex = this.rects.length - 1;
                break;
        }
        this.reset3action();
    }
    
    /**
     * 遮罩 决策项 事件委托
     * @param e
     */
    choiceHandler(e){
        if(e.target.getAttribute('class').split(" ")[2] === 'fa-check'){
            this.confirmMask(e);
        }else{
            this.cancelMask(e);
        }
    }
    
    /**
     * 确定本次对某遮罩的用户交互
     * @param e
     */
    confirmMask(e){
        this.clearCanvas();
        this.fillRects();
        
        this.choiceDiv.style.display = 'none';
        
        // 重置数据
        this.origin = [0, 0];
        this.wh = [0, 0];
    }
    
    /**
     * 取消本次对某遮罩的用户交互
     * @param e
     */
    cancelMask(e){
        // 从this.rects中删除活动的矩形对象, 最重要一步
        this.rects.splice(this.activeIndex ,1);
        
        // 清空画布
        this.clearCanvas();
        // 填充矩形列表
        this.fillRects();
    
        this.choiceDiv.style.display = 'none';
    
        // 重置数据
        this.origin = [0, 0];
        this.wh = [0, 0];
    }
    
    // --------------------------mouse move--------------------------------
    /**
     * mousemove事件处理, 创建一个新矩形
     * @param rectCoord
     */
    drawRectMMoveHandler(rectCoord){
        // 清空画布
        this.clearCanvas();
        // 填充矩形列表
        this.fillRects();
        // 画当前矩形
        this.strokeRect(rectCoord);
    }
    
    /**
     * mousemove事件处理, 移动一个矩形
     * @param rectIndex
     * @param rectCoord
     */
    moveRectMMoveHandler(rectIndex, rectCoord){
        console.log("你正在移动一个矩形");
        // 根据索引获取要移动的矩形引用的坐标
        let selectedRectCoord = this.rects[rectIndex].coord;
        // 移动后矩形的坐标
        let newRectCoord = [selectedRectCoord[0] + rectCoord[2], selectedRectCoord[1] + rectCoord[3], selectedRectCoord[2], selectedRectCoord[3]];
        // 绘制过程：清屏-> 填充其他矩形 -> 勾勒自身
        this.clearCanvas();
        this.fillRectsButOne(rectIndex);
        this.strokeRect(newRectCoord);
    }
    
    /**
     * mousemove事件处理, 缩放一个矩形
     * @param rectIndex
     * @param rectCoord
     */
    scaleRectMMoveHandler(rectIndex, rectCoord){
        console.log("你正在缩放一个矩形");
        // 根据索引获取要移动的矩形引用的坐标
        let selectedRectCoord = [...this.rects[rectIndex].coord];
        // 缩放后矩形的坐标
        let boundDirection = this.getScaleBoundary(this.origin, selectedRectCoord);
        this.getScaledCoord(selectedRectCoord, boundDirection);
        // 绘制过程：清屏-> 填充其他矩形 -> 勾勒自身
        this.clearCanvas();
        this.fillRectsButOne(rectIndex);
        this.strokeRect(selectedRectCoord);
    }
    
    // -------------------------------mouse up--------------------------------------
    /**
     * 鼠标弹起事件，创建一个矩形分支
     */
    moveRectMUpHandler(){
        // 更新this.rects列表中本次移动的矩形的数据
        this.rects[this.toMoveIndex].coord[0] += this.wh[0];
        this.rects[this.toMoveIndex].coord[1] += this.wh[1];
        
        // 弹出choiceDiv
        let x = this.rects[this.toMoveIndex].coord[0] + this.rects[this.toMoveIndex].coord[2] - this.choiceElWidth;
        let y = this.rects[this.toMoveIndex].coord[1] + this.rects[this.toMoveIndex].coord[3];
        this.choiceDiv.style.left = x + "px";
        this.choiceDiv.style.top = y  + "px";
        this.choiceDiv.style.display = 'block';
    }
    
    /**
     * mouseup事件处理，缩放完一个矩形
     * @param index
     */
    scaleRectMUpHandler(index){
        // 更新this.rects列表中本次缩放的矩形的数据
        let coord = this.rects[index].coord;
        // 缩放后矩形的坐标
        let boundDirection = this.getScaleBoundary(this.origin, coord);
        this.getScaledCoord(coord, boundDirection);
        
        // 弹出choiceDiv
        let x = coord[0] + coord[2] - this.choiceElWidth;
        let y = coord[1] + coord[3];
        this.choiceDiv.style.left = x + "px";
        this.choiceDiv.style.top = y  + "px";
        this.choiceDiv.style.display = 'block';
    }
    
    /**
     * mouseup事件处理，新建完一个矩形
     */
    drawRectMUpHandler(){
        // 新建矩形添加到this.rects中
        this.rects.push({
            maskId: this.maskId ++,
            coord: [...this.origin, ...this.wh],
        });
        
        // 弹出choiceDiv
        let x = this.rects[this.rects.length - 1].coord[0] + this.rects[this.rects.length - 1].coord[2] - this.choiceElWidth;
        let y = this.rects[this.rects.length - 1].coord[1] + this.rects[this.rects.length - 1].coord[3];
        this.choiceDiv.style.left = x + "px";
        this.choiceDiv.style.top = y  + "px";
        this.choiceDiv.style.display = 'block';
    }
    
    // -----------------------------------方法-----------------------------------
    
    /**
     * 判断鼠标是否按下
     * @returns {boolean}
     */
    ismouseDown(){
        return this.origin[0] !== 0 || this.origin[1] !== 0;
    }
    
    strokeRect(rectCoord){
        this.ctx.strokeRect(...rectCoord);
    }
    
    fillRect(rectCoord){
        this.ctx.fillRect(...rectCoord);
    }
    
    /**
     * 清空整个画布
     */
    clearCanvas(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 填充目前this.rects列表中所有矩形 及文本
     */
    fillRects(){
        for(let i = 0; i < this.rects.length; i++){
            let coord = this.rects[i].coord;
            this.ctx.fillRect(coord[0], coord[1], coord[2], coord[3]);
            
            // 绘制矩形上mask id数字
            this.ctx.save();
            this.ctx.font = "20px Arial";
            this.ctx.fillStyle = "#000000";
            this.ctx.textAlign = 'center';
            let textX = coord[0] + coord[2] / 2;
            let textY = coord[1] + 20;
            this.ctx.fillText(this.rects[i].maskId + 1, textX, textY);
            this.ctx.restore();
        }
    }
    
    /**
     * 填充 除index索引指代的矩形外 目前this.rects列表中 的所有矩形 及文本
     * @param index
     */
    fillRectsButOne(index){
        for(let i = 0; i < this.rects.length; i++){
            if(i !== index){
                let coord = this.rects[i].coord;
                this.ctx.fillRect(coord[0], coord[1], coord[2], coord[3]);
                
                // 绘制矩形上mask id数字
                this.ctx.save();
                this.ctx.font = "20px Arial";
                this.ctx.fillStyle = "#000000";
                this.ctx.textAlign = 'center';
                let textX = coord[0] + coord[2] / 2;
                let textY = coord[1] + 20;
                this.ctx.fillText(this.rects[i].maskId + 1, textX, textY);
                this.ctx.restore();
            }
        }
    }
    
    removeRect(){
    
    }
    
    reset3action(){
        this.toScaleIndex = -1;
        this.toMoveIndex = -1;
        this.todo = '';
    }
    
    /**
     * 点在矩形内
     * @param point [x, y]
     * @param rect [x, y, w, h]
     * @returns {boolean}
     */
    isPointInRect(point, rect){
        let isIn = false;
        let xDir = point[0] >= rect[0] && point[0] <= rect[0] + rect[2];
        let yDir = point[1] >= rect[1] && point[1] <= rect[1] + rect[3];
        if(xDir && yDir){
            isIn = true;
        }
        return isIn;
    }
    
    /**
     * 点在矩形边界上
     * @param point
     * @param rect
     */
    isPointOnBoundary(point, rect){
        let isOn = false;
        let range = 1;
        let onleft = (point[0] <= rect[0] + range) && (point[0] >= rect[0] - range);
        let onright = (point[0] <= rect[0] + rect[2] + range) && (point[0] >= rect[0] + rect[2] - range);
        let ontop = (point[1] <= rect[1] + range) && (point[1] >= rect[1] - range);
        let onbottom = (point[1] <= rect[1] + rect[3] + range) && (point[1] >= rect[1] + rect[3] - range);
        
        if(onleft || onright || ontop || onbottom){
            isOn = true;
        }
        return isOn;
    }
    
    /**
     * 确定用户在对哪条矩形边进行拖拽
     * @param point
     * @param rect
     */
    getScaleBoundary(point, rect){
        let range = 1;
        
        let pointX = point[0];
        let pointY = point[1];
        
        let rectLeft = rect[0];
        let rectRight = rect[0] + rect[2];
        let rectTop = rect[1];
        let rectBottom = rect[1] + rect[3];
        
        let w = (pointX <= rectLeft + range) && (pointX >= rectLeft - range) && pointY > rectTop + range && pointY < rectBottom - range;
        let e = (pointX <= rectRight + range) && (pointX >= rectRight - range) && pointY > rectTop + range && pointY < rectBottom - range;
        let n = (pointY <= rectTop + range) && (pointY >= rectTop - range) && pointX > rectLeft + range && pointX < rectRight - range;
        let s = (pointY <= rectBottom + range) && (pointY >= rectBottom - range) && pointX > rectLeft + range && pointX < rectRight - range;
        let nw = (pointX <= rectLeft + range && pointX >= rectLeft - range) && (pointY >= rectTop - range && pointY <= rectTop + range);
        let ne = (pointX <= rectRight + range && pointX >= rectRight - range) && (pointY >= rectTop - range && pointY <= rectTop + range);
        let sw = (pointX <= rectLeft + range && pointX >= rectLeft - range) && (pointY >= rectBottom - range && pointY <= rectBottom + range);
        let se = (pointX <= rectRight + range && pointX >= rectRight - range) && (pointY >= rectBottom - range && pointY <= rectBottom + range);
        
        if(w){
            return "w";
        }else if(e){
            return "e";
        }else if(n){
            return "n";
        }else if(s){
            return "s";
        }else if(nw){
            return "nw";
        }else if(ne){
            return "ne"
        }else if(sw){
            return "sw";
        }else if(se){
            return "se";
        }
    }
    
    /**
     * 缩放情况下，计算每一次MouseMove变换后的矩形坐标
     * @param rectCoord
     * @param direction
     */
    getScaledCoord(rectCoord, direction){
        let newRect = rectCoord;
        switch (direction){
            case "n":
                newRect[1] += this.wh[1];
                newRect[3] -= this.wh[1];
                break;
            case "s":
                newRect[3] += this.wh[1];
                break;
            case "w":
                newRect[0] += this.wh[0];
                newRect[2] -= this.wh[0];
                break;
            case "e":
                newRect[2] += this.wh[0];
                break;
            case "nw":
                newRect[0] += this.wh[0];
                newRect[1] += this.wh[1];
                newRect[2] -= this.wh[0];
                newRect[3] -= this.wh[1];
                break;
            case "ne":
                newRect[1] += this.wh[1];
                newRect[2] += this.wh[0];
                newRect[3] -= this.wh[1];
                break;
            case "sw":
                newRect[0] += this.wh[0];
                newRect[2] -= this.wh[0];
                newRect[3] += this.wh[1];
                break;
            case "se":
                newRect[2] += this.wh[0];
                newRect[3] += this.wh[1];
                break;
        }
        return newRect;
    }
    
}

let el = document.getElementById("canvas");
let choiceEl = document.getElementsByClassName('choice')[0];
let btn = document.getElementsByClassName('btn-mask')[0];
let mask = new Mask(el, choiceEl);
btn.addEventListener('click', function () {
    mask.enableDrawMask();
});
