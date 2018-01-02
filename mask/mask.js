/**
 * @file:   mask.js
 * @path:   mask/mask.js
 * @desc:   遮罩主类
 * @date:  2018.01.02
 */

class Mask{
    constructor(el, choiceEl, option){
        
        // 要画遮罩的元素，要求是个canvas
        this.canvas = el || null;
        this.canvas.width = parseInt(window.getComputedStyle(this.canvas).width);
        this.canvas.height = parseInt(window.getComputedStyle(this.canvas).height);
        this.choiceEl = choiceEl;
        this.choiceElWidth = parseInt(window.getComputedStyle(this.choiceEl).width);
        
        // canvas绘图环境
        this.ctx = this.canvas.getContext('2d') || null;
        let ctx = this.ctx;
        // 接口项 设置
        ctx.fillStyle = option.fillStyle || "#eeeeee";
        ctx.strokeStyle = option.strokeStyle || "#0000ff";
        this.bRectsStrokeStyle = option.bRectsStrokeStyle || ctx.strokeStyle;// 矩形边界上的小矩形的颜色
        this.inRectCursor = option.inRectCursor || 'move';// 当鼠标处于某个小矩形内部时鼠标样式
        this.bSideLength = option.bSideLength || 6; // 矩形边界上小矩形的边长值
        this.masksTime = option.masksTime;// 每个遮罩的开始显示时间和结束显示时间，一个遮罩对应一个矩形
        this.second = 0; // 接收外界传来的秒数，一秒接收一次
        
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
        this.modifyCursorStyle([e.offsetX, e.offsetY]);
        
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
        switch (this.todo){
            case "move":
                this.moveRectMUpHandler(this.toMoveIndex);
                this.activeIndex = this.toMoveIndex;
                break;
            case "scale":
                this.scaleRectMUpHandler(this.toScaleIndex);
                this.activeIndex = this.toScaleIndex;
                break;
            case "new":
                this.drawRectMUpHandler();
                this.activeIndex = this.rects.length - 1;
                break;
        }
        //console.log("活动矩形：" ,this.rects[this.activeIndex]);
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
        // 绘制矩形上的八个边界小矩形
        this.strokeEightDirection(rectCoord);
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
        // 绘制矩形上的八个边界小矩形
        this.strokeEightDirection(newRectCoord);
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
        // 绘制矩形上的八个边界小矩形
        this.strokeEightDirection(selectedRectCoord);
    }
    
    // -------------------------------mouse up--------------------------------------
    /**
     * 鼠标弹起事件，创建一个矩形分支
     */
    moveRectMUpHandler(index){
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
        
        // 纠正一下矩形坐标, 保证宽高为正数，原点为左上角，即rect数组每个数据的正确性。
        let rightRect = this.rectifyCoord([...this.origin, ...this.wh]);
        this.origin = [rightRect[0], rightRect[1]];
        this.wh = [rightRect[2], rightRect[3]];
        
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
    
    strokeRect(rectCoord){
        this.ctx.strokeRect(...rectCoord);
    }
    
    fillRect(rectCoord){
        this.ctx.fillRect(...rectCoord);
    }
    
    fillText(rect){
        let coord = rect.coord;
        // 绘制矩形上mask id数字
        this.ctx.save();
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#000000";
        this.ctx.textAlign = 'center';
        let textX = coord[0] + coord[2] / 2;
        let textY = coord[1] + 20;
        this.ctx.fillText(rect.maskId + 1, textX, textY);
        this.ctx.restore();
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
            this.fillText(this.rects[i]);
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
                this.fillText(this.rects[i]);
            }
        }
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
        let range = 4;
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
        let range = 4;
        
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
    
    /**
     * 如果新建矩形时，不是从左上角向右下角画的，则要对矩形rect数组中的四个数进行变换
     * 使其成为一个从左上角到右下角画出来的矩形
     * @param rect
     * @returns {*}
     */
    rectifyCoord(rect){
        let x = rect[0];
        let y = rect[1];
        let width = rect[2];
        let height = rect[3];
        
        // 左下角到右下角画出来的矩形
        if(width > 0 && height < 0){
            rect = [x, y + height, width, Math.abs(height)];
            
        // 右上角到左下角画出来的矩形
        }else if(width < 0 && height > 0){
            rect = [x + width, y, Math.abs(width), height];
            
        // 右下角到左上角画出来的矩形
        }else if(width < 0 && height < 0){
            rect = [x + width, y + height, Math.abs(width), Math.abs(height)];
        }
        
        return rect;
    }
    
    /**
     * 如果鼠标移动到某个矩形内部或边界，修改canvas元素的鼠标形状
     * @param point
     */
    modifyCursorStyle(point){
        let topo = 'outer';
        let whichBorder = '';
        for(let i = 0; i < this.rects.length; i++){
            if(this.isPointInRect(point, this.rects[i].coord)){
                topo = 'inner';
                break;
            }
            if(this.isPointOnBoundary(point, this.rects[i].coord)){
                topo = 'border';
                whichBorder = this.getScaleBoundary(point, this.rects[i].coord);
                break;
            }
        }
        
        if(topo === 'inner'){
            // 通过外部设置
            this.canvas.style.cursor = this.inRectCursor;
        }else if(topo === 'outer'){
            this.canvas.style.cursor = "default";
        }else if(topo === 'border'){
            switch (whichBorder){
                case "n":
                    this.canvas.style.cursor = "n-resize";
                    break;
                case "s":
                    this.canvas.style.cursor = "s-resize";
                    break;
                case "w":
                    this.canvas.style.cursor = "w-resize";
                    break;
                case "e":
                    this.canvas.style.cursor = "e-resize";
                    break;
                case "nw":
                    this.canvas.style.cursor = "nw-resize";
                    break;
                case "ne":
                    this.canvas.style.cursor = "ne-resize";
                    break;
                case "sw":
                    this.canvas.style.cursor = "sw-resize";
                    break;
                case "se":
                    this.canvas.style.cursor = "se-resize";
                    break;
                
            }
        }
    }
    
    /**
     * 绘制矩形的八个角，方便缩放
     * @param rect
     */
    strokeEightDirection(rect){
        let eightRects;
        let width = this.bSideLength;
        let height = width;
        let halfWidth = width / 2;
        let halfHeight = height / 2;
        let rectX = rect[0];
        let rectY = rect[1];
        let rectW = rect[2];
        let rectH = rect[3];
        let nw = [rectX - halfWidth, rectY - halfHeight, width, height];
        let n = [rectX + rectW / 2 - halfWidth, rectY - halfHeight, width, height];
        let ne = [rectX + rectW - halfWidth, rectY - halfHeight, width, height];
        let e = [rectX + rectW - halfWidth, rectY + rectH / 2 - halfHeight, width, height];
        let se = [rectX + rectW - halfWidth, rectY + rectH - halfHeight, width, height];
        let s = [rectX + rectW / 2 - halfWidth, rectY + rectH - halfHeight, width, height];
        let sw = [rectX - halfWidth, rectY + rectH - halfHeight, width, height];
        let w = [rectX - halfWidth, rectY + rectH / 2 - halfHeight, width, height];
        eightRects = [nw, n, ne, e, se, s, sw, w];
        
        this.ctx.save();
        this.ctx.strokeStyle = this.bRectsStrokeStyle;
        this.strokeRects(eightRects);
        this.ctx.restore();
    }
    
    /**
     * stroke一个矩形列表
     * @param rects e.g. rects = [rect1, rect2], rect1 = [1,2,3,4], rect2 = [2,3,4,5]
     */
    strokeRects(rects){
        for(let i = 0; i < rects.length; i++){
            let coord = rects[i];
            this.ctx.strokeRect(coord[0], coord[1], coord[2], coord[3]);
        }
    }
    
    //-------------------------------------控制遮罩显示与隐藏部分---------------------------------------------------
    /**
     * 根据this.masksTime修改this.rects，为其添加startTime和endTime属性
     */
    addTimeProp(){
        for(let i = 0; i < this.masksTime.length; i++){
            for(let j = 0; j < this.rects.length; j++){
                if(this.rects[j].maskId === this.masksTime[i].maskId){
                    this.rects[j].startTime = this.masksTime[i].startTime;
                    this.rects[j].endTime = this.masksTime[i].endTime;
                    break;
                }
            }
        }
    }
    
    /**
     * 根据每个遮罩的显示/隐藏时间，与当前接收到的秒数，每秒批量控制一次遮罩们的显隐
     */
    showAndHideControl(){
        console.log(this.second);
        this.addTimeProp();
        for(let i = 0; i < this.rects.length; i++){
            if(this.second >= this.rects[i].startTime && this.second <= this.rects[i].endTime){
                this.show(i);
            }else{
                this.hide(i);
            }
        }
    }
    
    /**
     * 让this.rects中的指定遮罩显示
     * @param index
     */
    show(index){
        let coord = this.rects[index].coord;
        this.fillRect(coord);
        
        // 绘制矩形上mask id数字
        this.fillText(this.rects[index]);
    }
    
    /**
     * 让this.rects中的指定遮罩隐藏
     * @param index
     */
    hide(index){
        this.clearRectByIndex(index);
    }
    
    /**
     * 清除画布的局部，清除一个矩形的区域
     * @param index
     */
    clearRectByIndex(index){
        this.ctx.clearRect(...this.rects[index].coord);
    }
    
}