var cli = require("./myClient");
var data = require("./data");
	
function Server() {
	this.io = null;	//绑定的io对象
	this.clients =[];	//记录所有的客户端
	this.tHand = null;	//定时器句柄
	this.cfg = null;	//当前游戏配置信息
	this.info = null;	//当前游戏信息
}

Server.prototype = {
		
	//初始化监听
	listen: function(port) {
		this.io = require("socket.io").listen(port);
		//设置日志级别
		this.io.set('log level', 1);
		//获取游戏信息
		this.cfg = data.gameData().cfg;
		this.info = data.gameData().info;
		this.doConnect();
	},

	//客户端于此连接，客户端数组增加一个客户端
	doConnect: function(socket) {
		var self = this;
		this.io.sockets.on("connection", function(socket) {
			p("add a new client:" + socket.id);
			self.clients.push(cli.newClient(self, socket));
		});
	},
	
	//判断用户名是否已经存在
	isUserExists: function(client) {
		for(var i=0; i<this.clients.length; i++) {
			if(client != this.clients[i] && client.user.uname == this.clients[i].user.uname) {
				return true;
			}
		}
		return false;
	},
	
	//移除一个socket客户端
	removeClientByID: function(socketID) {
		var idx = -1;
		for(var i=0; i<this.clients.length; i++) {
			if(socketID == this.clients[i].socket.id) {
				idx = i;
				break;
			}
		}
		
		if(idx != -1) {
			this.clients.splice(idx, 1);
		}
		
		//如果所有客户端都退出，则重置游戏
		if(this.info.status != 0 && this.clients.length == 0) {
			this.endGameRound();
		}
	},
	
	//获取所有用户
	getAllUsers: function() {
		var p = [];
		for(var i=0; i<this.clients.length; i++) {
			p.push(this.clients[i].user);
		}
		return p;
	},
	
	//通知客户端更新用户信息
	updateUserInfo: function() {
		var users = this.getAllUsers();
		if(users.length != 0) {
			this.broadcastEvent("updateUserInfo", users);
		}
	},
	
	//重置游戏信息
	resetGameInfo: function() {
		var info = this.info;
		info.time = 0;
		info.round = 0;
		info.uIdx = -1;
		info.user = null;
		info.question = {type: null, data: null};
		info.status = 0;
		info.rUserCount = 0;
		info.rUser = null;
	},
	
	//开始游戏回合
	startGameRound: function() {
		var self = this;
		//如果所有回合都已结束
		if(this.info.round == this.cfg.round) {
			this.endGameRound();
			return;
		}
		//游戏回合数自增1
		this.info.round++;
		this.broadcastMsg("---第" + (this.info.round) + "回合开始---");
		//开始提问
		this.startQuestion();
		
	},
	
	//开始提问
	startQuestion: function() {
		var self = this;
		this.info.time = 0;
		this.info.status = 1;
		this.info.question = this.getRandQuestion();
		this.info.user = this.getNextUser();
		this.info.rUserCount = 0;
		this.info.rUser = null;
		this.broadcastEvent("startQuestion", [this.info, this.cfg.time, this.cfg.round]);
		this.doQuestionReady();
	},
	
	//提问前准备
	doQuestionReady: function() {
		var self = this;
		var time = 5;
		this.broadcastEvent("questionReady", time);
		this.tHand = setInterval(function() {
			if(time < 0) {
				clearInterval(self.tHand);
				//开始一个提问
				self.tHand = setInterval(function() {
					self.info.time++;
					self.processQuestion();
				}, 1000);
			} else {
				self.broadcastEvent("questionReady", --time);
			}
		}, 1000);
	},
	
	//处理一个问题,开始一个问题时，每秒钟发送
	processQuestion: function() {
		if(this.isQuestionOver()) {
			this.endQuestion();
		} else {
			this.broadcastEvent("processQuestion", this.cfg.time - this.info.time);
		}
		
		//定点发出提示信息
		if(this.info.time == 10) {
			this.broadcastEvent("hint", this.info.question.data.length+"个字");
		}
		if(this.info.time == 20) {
			this.broadcastEvent("hint", "类型:"+this.info.question.type);
		}
	},
	
	//是否是正确答案
	isRightAnswer:function(answer) {
		return answer == this.info.question.data;
	},
	
	//检查一个问题是否可以结束
	isQuestionOver: function() {
		return this.info.status == 1 && (this.isAllRight() || this.info.time > this.cfg.time);
	},
	
	//检测是否所有用户都已经答对
	isAllRight: function() {
		return this.info.rUserCount == this.clients.length - 1;
	},
	
	
	
	//结束一个问题
	endQuestion: function() {
		var self = this;
		clearInterval(this.tHand);
		this.info.status = 2;
		//运行3秒后重新开始一个问题
		var t = 3;
		this.broadcastEvent("endQuestion");
		self.tHand = setInterval(function() {
			t--;
			if(t == 0) {
				if(self.info.uIdx != self.clients.length - 1) {
					self.startQuestion();
				} else {
					self.startGameRound();
				}
			}
		}, 1000);
	},
	
	//终止游戏回合
	endGameRound: function() {
		clearInterval(this.tHand);
		this.resetGameInfo();
		this.broadcastEvent("gameOver");
	},
	
	
	//获取下一个可用用户
	getNextUser: function() {
		if(this.clients.length > 0) {
			var idx = (++this.info.uIdx)%this.clients.length;
			this.info.uIdx = idx;
			return this.clients[idx].user;
		} else {
			return null;
		}
	},
	
	//随机产生题目
	getRandQuestion: function() {
		var tidx = Math.random()*this.cfg.qtype.length|0;
	    var didx = Math.random()*this.cfg.qdata[tidx].length|0;
	    var type = this.cfg.qtype[tidx];
		var data = this.cfg.qdata[tidx][didx];
		var question = {};
		question.type = type;
		question.data = data;
		return question;
	},
	
	//获取奖励,第一个答对的用户得2分其他的得1分，如果是当前用户则不用，否则，只要有一个用户答对，该操作用户得3分
	getAward: function(user) {
		var result = 0;
		if(user.uname != this.info.user.uname) {
			this.info.rUserCount++;
			if(this.info.rUserCount == 1) {
				result = 2;
			} else {
				result = 1;
			}
		}
		return result;
	},
	
	
	//广播消息
	broadcastMsg: function(msg) {
		this.io.sockets.send(msg);
	},
	
	//广播事件
	broadcastEvent: function(eventName, data) {
		p("*****:" + eventName);
		this.io.sockets.emit(eventName, data);
	}
	
};

new Server().listen(30000);

function p(obj) {
	console.log(obj);
}

console.log("server is running...");