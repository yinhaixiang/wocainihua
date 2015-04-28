//定义painter对象
var painter = {
	ctx: null,
	width: 0,
	height: 0,
	storageColor: "black",	//记录颜色
	storageLineWidth: 3,	//记录笔粗
	isDrawing: false,		//是否在画
	isPen: true				//是否选中笔
}

//初始化
painter.init = function() {
	var canvas = $("#paintArea")[0];
	this.ctx = canvas.getContext("2d");
	
	this.width = canvas.width;
	this.height = canvas.height;
	this.initCanvas();
	
}

//初始化canvas，监听各个事件
painter.initCanvas = function() {
	var self = this;
	var canvas = $("#paintArea");
	
	canvas.mousedown(function(evt) {
		if(client.isOperUser()) {
			evt.preventDefault();
			var canvasPosition = $(this).offset();
			var mouseX = evt.pageX - canvasPosition.left;
			var mouseY = evt.pageY - canvasPosition.top;
			self.fire("onStartDraw", {"x": mouseX, "y": mouseY});
			self.isDrawing = true;
		}
		
	});
	
	canvas.mousemove(function(evt) {
		if(self.isDrawing) {
			var canvasPosition = $(this).offset();
			var mouseX = evt.pageX - canvasPosition.left;
			var mouseY = evt.pageY - canvasPosition.top;
			self.fire("onDrawing", {"x": mouseX, "y": mouseY});
		}
	});
	
	canvas.mouseup(function(evt) {
		self.isDrawing = false;
	});
	
	canvas.mouseout(function(evt) {
		self.isDrawing = false;
	});
}

//触发画板事件
painter.fire = function(eventName, param) {
	if(this[eventName]) {
		this[eventName](param);
	}
}

//开始落笔画
painter.onStartDraw = function(data) {
	this.ctx.beginPath();
	this.ctx.moveTo(data.x, data.y);
	
	if(client.isOperUser()) {
		client.emitStartDraw(data);
	}
}

//正在画
painter.onDrawing = function(data) {
	this.ctx.lineTo(data.x, data.y);
	this.ctx.stroke();
	
	if(client.isOperUser()) {
		client.emitDrawing(data);
	}
}

//更新画板事件
painter.onPaintUpdate = function(data) {
	if(data.isPen != undefined) {
		this.isPen = data.isPen;
	}
	var color = data.color || this.storageColor;
	var lineWidth = data.lineWidth || this.storageLineWidth;
	this.setBrushColor(color);
	this.setBrushWidth(lineWidth);
	
	if(client.isOperUser()) {
		var param = {};
		param.lineWidth = lineWidth;
		param.color = color;
		param.isPen = this.isPen;
		client.emitPaintUpdate(param);
	}
}

//清空画布
painter.onClearCanvas = function() {
	var canvas = $("#paintArea")[0];
	this.ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	if(client.isOperUser()) {
		client.emitClearCanvas();
	}
}

//设置颜色
painter.setBrushColor = function(color) {
	this.storageColor = color;
	if(this.isPen) {
		this.ctx.strokeStyle = color;
	} else {
		this.ctx.strokeStyle = "white";
	}
}

//设置笔粗
painter.setBrushWidth = function(lineWidth) {
	this.storageLineWidth = lineWidth;
	if(this.isPen) {
		this.ctx.lineWidth = lineWidth;
	} else {
		this.ctx.lineWidth = lineWidth * 3;
	}
}



//初始化画笔区(只有当前画画的玩家初始化)
painter.initBrush = function(visible) {
	if(!visible) {
		$("#operDiv").css("visibility", "hidden");
		return;
	}
	$("#operDiv").css("visibility", "visible");
	var self = this;
	
	this.ctx.lineCap = "round";
	this.ctx.lineJoin = "round";
	var data = {};
	data.color = "black";
	data.lineWidth = 3;
	data.isPen = true;
	self.fire("onPaintUpdate", data);
	
	//设置各默认显示
	$("#color").children().css("border", "solid 2px #666");
	$("#bcdx").children().css("background", "none");
	$("#ssx").children().css("background", "none");
	$("#color").children().eq(0).css("border", "solid 2px #fff");
	$("#bcdx").children().eq(1).css("background", "yellow");
	$("#ssx").children().eq(0).css("background", "yellow");
	
	
	$("#color").children().each(function(index) {
		$(this).click(function() {
			self.isPen = true;
			
			var data = {};
			data.color = this.id;
			self.fire("onPaintUpdate", data);
			
			$("#color").children().css("border", "solid 2px #666");
			$(this).css("border", "solid 2px #fff");
			$("#ssx").children().eq(0).css("background", "yellow");
			$("#ssx").children().eq(1).css("background", "none");
		});
	});
	
	
	$("#bcdx").children().each(function(index) {
		$(this).click(function() {
			var data = {};
			data.lineWidth = index*2+1;
			self.fire("onPaintUpdate", data);
			
			$("#bcdx").children().css("background", "none");
			$(this).css("background", "yellow");
		});
	});
	
	$("#ssx").children().each(function(index) {
		$(this).click(function() {
			if(index != 2) {
				$("#ssx").children().css("background", "none");
				$(this).css("background", "yellow");
			}
			if(index == 0) {
				self.isPen = true;
				self.fire("onPaintUpdate", {});
			} else if(index == 1) {
				self.isPen = false;
				self.fire("onPaintUpdate", {});
			} else if(index == 2) {
				self.fire("onClearCanvas", {});
			}
		});
	});
}

painter.init();

window.painter = painter;

function p(obj) {
	console.log(obj);
}
















