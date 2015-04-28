$(function() {
	//定义client对象
	var client = {
		socket: null,
		isFirstConnect: true,
		user: {},
		gameInfo: {}
	};
	
	//连接服务器
	client.connect = function() {
		var self = this;
		if(this.socket == null) {
			this.socket = io.connect("ws://localhost:30000");
			this.socket.on("connect", function() {self.doConnect();});
			this.socket.on("error", function(data) {this.socket = null; p("服务器连接失败！");});
		} else {
			this.socket.socket.reconnect();
		}
	}
	
	//连接事件
	client.doConnect = function() {
		if(this.isFirstConnect) {
			this.isFirstConnect = false;
			this.bindEvent();
		} else {
			this.socket.socket.reconnect();
		}
	}
	
	//当前用户是否是正在画图的用户
	client.isOperUser = function() {
		return this.user.uname == this.gameInfo.user.uname;
	}
	
	//登录
	client.login = function(callback) {
		this.socket.emit("login", this.user.uname, function(data) {
			callback(data);
		});
	}
	
	//发送开始画图事件
	client.emitStartDraw = function(data) {
		this.socket.emit("startDraw", data);
	}
	
	//发送正在画图事件
	client.emitDrawing = function(data) {
		this.socket.emit("drawing", data);
	}
	
	//发送画板更新事件
	client.emitPaintUpdate = function(data) {
		this.socket.emit("paintUpdate", data);
	}
	
	//发送清楚画布事件
	client.emitClearCanvas = function() {
		this.socket.emit("clearCanvas", {});
	}
	
	//发送消息
	client.sendMsg = function(msg) {
		this.socket.send(msg);
	}
	
	
	//绑定各个事件
	client.bindEvent = function() {
		var self = this;

		//注册开始画画事件
		this.socket.on("startDraw",function(data){painter.onStartDraw(data)});
		//注册画画事件
		this.socket.on("drawing",function(data){painter.onDrawing(data)});
		//处理画板更新事件		  
		this.socket.on("paintUpdate",function(data){painter.onPaintUpdate(data);});
		//清空画布事件		  
		this.socket.on("clearCanvas",function(){painter.onClearCanvas();});
		
		//消息事件
		this.socket.on("message",function(msg){self.doMessage(msg);});
		//处理游戏用户更新事件
		this.socket.on("updateUserInfo",function(users){self.doUpdateUserInfo(users);});
		//处理游戏回合准备事件
		this.socket.on("questionReady",function(time){self.doQuestionReady(time);});
		//处理游戏开始事件
		this.socket.on("startQuestion",function(data){self.doStartQuestion(data);});	
		//处理游戏回答问题事件
		this.socket.on("processQuestion",function(time){self.doProcessQuestion(time);});		
		//提示事件
		this.socket.on("hint",function(hintInfo){self.doHint(hintInfo);});		
		//获取奖励
		this.socket.on("award",function(awdArray){self.doAward(awdArray);});		
		//结束问题
		this.socket.on("endQuestion",function(){self.doEndQuestion();});	 
		//结束游戏
		this.socket.on("gameOver",function(users){self.doGameOver(users);});
	}
	
	//收到消息信息
	client.doMessage = function(msg) {
		$("#msgArea").append(msg).append("<br/>");
		$("#msgArea").scrollTop($("#msgArea")[0].scrollHeight);
	}
	
	//更新用户信息
	client.doUpdateUserInfo = function(users) {
		var flag = (users.length > 1);
		var self = this;
		$("#userArea").empty();
		for(var i=0; i<users.length; i++) {
			self.updateUser(users[i], i, flag);
		}
	}
	
	//根据用户信息更新单个用户的UI
	client.updateUser = function(user, idx, flag) {
		var self = this;
		if(user.uname == this.user.uname) {
			this.user = user;
		}
		
		//创建用户UI
		var px = $("<div id='ulx' class='ulx'></div>");
		var ud = $("<div id='u_"+user.uname+"' class='uready'><div id='aw_"+user.uname+"' class='award'></div></div>");
		var glev = $("<div id='uc_"+user.uname+"' class='ugo'></div>");
		px.append("<div style='overflow:hidden'>"+user.uname+"</div>").append(ud).append(glev);
		$("#userArea").append(px);
		glev.text(user.score);
		//如果是第一个登录的用户,且用户多于一人
		if(user.uname == this.user.uname && idx == 0 && flag) {
			glev.text("GO!");
			glev.click(function(evt) {
				self.socket.emit("gameStart", null, function(data) {
					glev.unbind("click");
					glev.text(user.score);
				});
			});
		}
	}
	
	//处理游戏开始事件
	client.doStartQuestion = function(data) {
		var user = data[0].user;
		var msg = "现在由[" + user.uname + "]开始画画";
		this.gameInfo = data[0];
		painter.onClearCanvas();
		//恢复用户层样式
	    $("#ulx div[id^=u_]").each(function(){
	    	$(this).attr("class","uready");
		});
	    $("#u_"+user.uname).attr("class", "uoper");
	    //显示效果层
		$("#effect").show();
	    $("#qTime").show();
		$("#qTime").text(data[1]);
		//显示题目回合
	    $("#dround").text("第" + this.gameInfo.round + "/" + data[2] + "轮");
	    //如果是当前操作用户,修改信息栏
	    if(this.user.uname == user.uname) {
	    	painter.initBrush(true);
	    	var m = "请按照题目画图,题目是:<span style='color:red'>" + data[0].question.data + "</span>";
	    	$("#question").html(m);
	    } else {
	    	painter.initBrush(false);
	    	$("#question").html(msg);
	    }
	    $("#msgArea").append(msg+ "<br/>");
	    $("#msgArea").scrollTop($("#msgArea")[0].scrollHeight);
	}
	
	//处理游戏回合准备事件
	client.doQuestionReady = function(time) {
		$("#effect").text(time);
		if(time < 0) {
			$("#effect").hide();
			$("#paintArea").show();
		}
	}
	
	//处理游戏回答问题事件
	client.doProcessQuestion = function(time) {
		$("#qTime").text(time);
	}
	
	//提示信息
	client.doHint = function(hintInfo) {
		if(!this.isOperUser()) {
			$("#question").text("提示:" + hintInfo);
			$("#msgArea").append("提示:" + hintInfo + "<br/>"); 
			$("#msgArea").scrollTop($("#msgArea")[0].scrollHeight);
		}
	}
	
	//获得奖励
	client.doAward = function(awdArray) {
		for(var i=0; i<awdArray.length; i++) {
			var user = awdArray[i].user;
			var awd = awdArray[i].awd;
			//处理动画
			$("#ulx div[id=aw_"+user.uname+"]").text("+"+awd+"").attr("class","awardAnim").bind("webkitTransitionEnd",
				function(){
					$(this).text("").attr("class","award");
				})
			$("#ulx div[id=uc_"+user.uname+"]").text(user.score); 
		}
	}
	
	//结束一个问题
	client.doEndQuestion = function() {
		$("#paintArea").hide();
		client.showMessage("正确答案是:"+this.gameInfo.question.data);
		
	}
	
	client.doGameOver = function(users) {
		this.showMessage("Game Over!");
	}
	
	//显示信息
	client.showMessage = function(msg) {
		var p = $("#hb");
		var ww = p.width();
		var wh = p.height();
		var ox = p.offset().left;
		var oy = p.offset().top;
		var dmsg = $("#msg");
		dmsg.text(msg);
		dmsg.css("left",ox+(ww-300)*0.5);
		dmsg.css("top",oy+(wh-130)*0.5)
		
		$("#msg").fadeIn(100,function(){
			$(this).fadeOut(3000);    
		});
	}
	
	window.client = client;
});

function p (obj) {
	console.log(obj);	
}