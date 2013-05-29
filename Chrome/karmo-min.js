/**
 * Karmo - Gamble away your reddit karma
 *
 * Rules of the game:
 * 	You bet on posts to reach a certain amount of karma
 */var Karmo={DEBUG:!0,log:function(){Karmo.DEBUG&&console.log.apply(console,arguments)},error:function(){if(Karmo.DEBUG)throw Error.apply(Error,arguments)},template:{url:"templates/",extension:".template",templateNames:["small-bet-view","large-bet-view","main-bet-view","dashboard"],templates:{},getTemplates:function(e){(function t(n){Karmo.model.ajax({url:chrome.runtime.getURL(Karmo.template.url+n[0]+Karmo.template.extension),responseType:"text"},function(r){Karmo.template.templates[n[0]]=r;n.shift();n[0]?t(n):e()})})(Karmo.template.templateNames)},render:function(e,t,n,r){var r=Mustache.render(Karmo.template.templates[n],r);switch(t){case"prepend":e.innerHTML=r+e.innerHTML;break;case"replace":e.innerHTML=r;break;case"append":default:e.innerHTML=e.innerHTML+r}}},storage:{prefix:"karmo.",get:function(e){var t=window.localStorage.getItem(Karmo.storage.prefix+e),n=/^(\w+);/.exec(t);if(!n)return t;t=t.replace(n[1]+";","");switch(n[1]){case"json":return JSON.parse(t)}},save:function(e,t){typeof t=="object"&&(t="json;"+JSON.stringify(t));return window.localStorage.setItem(Karmo.storage.prefix+e,t)}},model:{ajax:function(e,t,n){e.url||Karmo.error("Karmo.model.ajax: Please provide a url in the options object.");t||Karmo.error("Karmo.model.ajax: Please provide a callback as a second parameter.");var r={method:"get",responseType:"json"};for(var i in r)e[i]||(e[i]=r[i]);var s=new XMLHttpRequest;s.open(e.method.toUpperCase(),e.url,!0);s.onreadystatechange=function(){if(this.readyState==4)if(this.status==200){data=this.response;switch(e.responseType){case"json":data=JSON.parse(data)}t(data,this)}else n&&n(this)};s.send()},betting:{getBettingDataOnPost:function(e){return{bets:15,odds:{top:1,bottom:10},status:{"class":"hot",text:"Hot!"}}},getMetaDataOnBet:function(e){return{author:"renegademaniac",karma_riding:500,odds:{top:1,bottom:10},placed_at:Date.now}},calculateOddsOnPost:function(e,t,n){}},user:{getUser:function(e){e({username:"renegademaniac",karma:1800,karmo:12e3,bets:200})},isUserAPlayer:function(e,t){t(!0)}},current:{subreddit:function(){return document.querySelectorAll(".pagename")[0].innerText}()}},view:{betting:{displayBetSmall:function(e,t){Karmo.template.render(e,"prepend","small-bet-view",t);e.querySelectorAll(".bet")[0].addEventListener("click",function(){Karmo.view.betting.displayBetLarge(e,t)})},displayBetLarge:function(e,t){var n=e.querySelectorAll(".karmo-large-bet-view");Karmo.template.render(e,"append","large-bet-view",t)},hideLargeBetDisplay:function(e){}},user:{displayKarmoSmall:function(e){var t=document.querySelectorAll(".userkarma")[0];t.innerHTML=e.karma+"/"+e.karmo+"";t.setAttribute("alt","Your karma and karmo")},displayKarmoLarge:function(e){var t=document.querySelectorAll(".titlebox")[0],n='<span class="karma karmo">'+e.karmo+"</span> karmo",r=t.innerHTML.replace("<br>","<br>"+n+"<br>");t.innerHTML=r},displayIsUsersPlayers:function(e){Karmo.model.user.isUserAPlayer(e.innerText,function(t){if(t){var n=document.createElement("span");n.classList.add("karmo-dot");e.parentNode.insertBefore(n,e.nextSibling);n.addEventListener("mouseover",function(){Karmo.view.user.displayDotInformationPopup(n)})}})},displayDotInformationPopup:function(e){}},bets:{init:function(){var e=document.querySelectorAll("div.content")[0];Karmo.template.render(e,"replace","main-bet-view")}},dashboard:{init:function(){}},displayKarmoOnListView:function(){Karmo.view.loopOverPosts(function(e){var t=Karmo.model.betting.getBettingDataOnPost();Karmo.view.betting.displayBetSmall(e,t)})},loopOverPosts:function(e){var t=document.querySelectorAll("#siteTable .thing");t&&Array.prototype.forEach.call(t,e)},modal:{create:function(e,t,n,r){var i=document.createElement("div");o.classList.add("karmo-modal-lightbox");var s=document.createElement("div");o.classList.add("karmo-modal-wrapper");var o=document.createElement("div");o.classList.add("modal");o.style.marginTop=t/2+"px";o.style.marginLeft=e/2+"px";o.style.width=e+"px";o.style.height=t+"px";Karmo.template.render(o,"append",n,r)}}},routes:{".":function(){Karmo.model.user.getUser(function(e){Karmo.view.user.displayKarmoSmall(e)});Array.prototype.forEach.call(document.querySelectorAll(".author"),function(e){Karmo.view.user.displayIsUsersPlayers(e)})},"/me/karmo":function(){Karmo.log("Main Page!");document.querySelectorAll(".pagename")[0].innerText="Karmo";var e=document.querySelectorAll("div.content")[0];e.innerHTML="";Karmo.template.render(e,"append","dashboard")},"\\/r\\/\\w+(?:/(top|controversial|rising|new)|(?!comments))?":function(e){Karmo.log("Sub reddit route matched.");Karmo.view.displayKarmoOnListView();var t=document.createElement("li"),n=document.createElement("a");n.setAttribute("href","#bets");n.innerText="bets on /r/"+Karmo.model.current.subreddit;t.appendChild(n);document.querySelectorAll(".tabmenu")[0].appendChild(t);n.addEventListener("click",function(){var e=document.querySelectorAll(".tabmenu .selected")[0];e.classList.remove("selected");t.classList.add("selected");Karmo.view.bets.init()})},"\\/user\\/([^\\/]+)":function(){Karmo.log("User view matched");Karmo.model.user.getUser(function(e){Karmo.view.user.displayKarmoLarge(e)})}},init:function(){Karmo.log("Route: ",window.location.pathname);Karmo.template.getTemplates(function(){for(var e in Karmo.routes){var t=(new RegExp(e)).exec(window.location.pathname);t&&Karmo.routes[e].call(Karmo,t)}})}};Karmo.init();