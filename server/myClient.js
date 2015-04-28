//定义Client类
var Client = function(server, socket) {
	this.server = server;
	this.socket = socket;
	this.user = {uname: null, level: 0, score: 0};
	this.bindEvent();
}

Client.prototype = {
	bindEvent: function() {
		var self = this;
		//登陆事件
		this.socket.on("login",function(uname,fn){self.doLogin(uname, fn);});
		//断开连接事件
		this.socket.on("disconnect",function(){self.doDisconnect();});
		//绑定处理消息事件
		this.socket.on("message",function(msg){self.doMsg(msg);});
		//开始画图事件
		this.socket.on("startDraw",function(data){self.broadcastStartDraw(data);});	
		//画图事件
		this.socket.on("drawing",function(data){self.broadcastDrawing(data);});
		//画板更新事件		  
		this.socket.on("paintUpdate",function(data){self.broadcastPaintUpdate(data);});
		//清空画布事件		  
		this.socket.on("clearCanvas",function(){self.broadcastClearCanvas();});
		//准备游戏开始事件
		this.socket.on("gameStart", function(data, fn) {self.doGameStart(data, fn);});
	},
	
	//登录
	doLogin: function(uname, fn) {
		this.user.uname = uname;
		//如果游戏还没开始
		if(this.server.info.status == 0) {
			var isExist = this.server.isUserExists(this);
			//如果不存在
			if(!isExist) {
				fn(0);
				this.server.updateUserInfo();
			} else {	//如果已存在
				fn(1);
				this.server.removeClientByID(this.socket.id);
			}
		} else {	//如果游戏已经开始，不用判断用户是否已存在
			this.server.removeClientByID(this.socket.id);
			fn(2);
		}
	},
	
	//连接断开
	doDisconnect: function() {
		this.server.removeClientByID(this.socket.id);
		this.server.updateUserInfo();
	},
	
	
	//处理消息
	doMsg: function(msg) {
		var info = this.server.info;
		
		if(info.status == 1 && this.server.isRightAnswer(msg)) {
			msg = "**";
			var award = this.server.getAward(this.user);
			if(award > 0) {
				var awd = [];
				this.user.score += award;
				awd.push({user: this.user, awd: award});
				if(info.rUserCount == 1) {
					info.user.score += 3;
					awd.push({user: info.user, awd: 3});
				}
				this.server.broadcastEvent("award", awd);
			}
		}
		
		var m = "[" + this.user.uname + "]:   " + msg;
		this.server.broadcastMsg(m);
	},
	
	//广播开始画图事件
	broadcastStartDraw: function(data) {
		this.socket.broadcast.emit("startDraw", data);
	},
	
	//广播画图事件
	broadcastDrawing: function(data) {
		this.socket.broadcast.emit("drawing", data);
	},
	
	//广播画板更新事件
	broadcastPaintUpdate: function(data) {
		this.socket.broadcast.emit("paintUpdate", data);
	},
	
	//广播清空画布事件
	broadcastClearCanvas: function() {
		this.socket.broadcast.emit("clearCanvas", {});
	},
	
	//准备游戏开始事件
	doGameStart: function(data, fn) {
		this.server.startGameRound();
		fn();
	}
};




//输出模块
exports.newClient = function(server, socket) {
	return new Client(server, socket);
}

function p (obj) {
	console.log(obj);	
}
