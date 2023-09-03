import { Change, DictTopic, ListTopic, SetTopic, StringTopic } from "chatroom-client"
import { SObject } from "./sobject"
import { Action } from "chatroom-client/src/utils"

export class ObjectTopic<T extends SObject = SObject>{
    get initialized(): boolean{
        return this._topic.initialized;
    }
    onInit: Action<[T]> = new Action();
    onSet: Action<[T]> = new Action();
    onSet2: Action<[T,T]> = new Action();
    constructor(topic: StringTopic,map: (id:string)=>T){
        this._topic = topic;
        this._map = map;
        this._topic.onInit.add((value)=>this.onInit.invoke(this.map(value)));
        this._topic.onSet.add((value)=>this.onSet.invoke(this.map(value)));
        this._topic.onSet2.add((old_value,new_value)=>this.onSet2.invoke(this.map(old_value),this.map(new_value)));
        
        let originalOnSetAdd = this.onSet.add.bind(this.onSet);
        this.onSet.add = (callback) => {
            originalOnSetAdd(callback);
            if(this.getValue() !== null)
                callback(this.getValue());
        }
    }
    _topic: StringTopic;
    _map: (id:string)=>T;

    set(value:T){
        if(value == null)
            return this._topic.set('');
        return this._topic.set(value.id);
    }
    getValue():T{
        return this.map(this._topic.getValue());
    }
    map(value:string){
        try{
            return this._map(value);
        }
        catch(e){
            return null as any; // Pretending this is C# ouo
        }
    }

}

export class ObjListTopic<T extends SObject = SObject>{
    get initialized(): boolean{
        return this._topic.initialized;
    }
    onInit: Action<[T[]]> = new Action();
    onSet: Action<[T[]]> = new Action();
    onSet2: Action<[T[]]> = new Action();
    onInsert: Action<[T]> = new Action();
    onPop: Action<[T]> = new Action();
    constructor(topic: ListTopic,map: (id:string)=>T){
        this._topic = topic;
        this._map = map;
        this._topic.onInit.add((value)=>this.onInit.invoke(value.map(this._map)));
        this._topic.onSet.add((value)=>this.onSet.invoke(value.map(this._map)));
        this._topic.onSet2.add((value)=>this.onSet2.invoke(value.map(this._map)));
        this._topic.onInsert.add((value)=>this.onInsert.invoke(this._map(value)));
        this._topic.onPop.add((value)=>this.onPop.invoke(this._map(value)));

        let originalOnSetAdd = this.onSet.add.bind(this.onSet);
        this.onSet.add = (callback) => {
            originalOnSetAdd(callback);
            if(this.getValue() !== null)
                callback(this.getValue());
        }
    }
    _topic: ListTopic;
    _map: (id:string)=>T;

    set(value:T[]){
        return this._topic.set(value.map(x=>x.id));
    }

    insert(object:T, position: number = -1){
        return this._topic.insert(object.id, position);
    }
    pop (position: number = -1){
        return this._map(this._topic.pop(position));
    }
    remove(object:T){
        return this._topic.remove(object.id);
    }
    getitem(key:number){
        return this._map(this._topic.getitem(key));
    }
    setitem(key:number, value:T){
        return this._topic.setitem(key, value.id);
    }
    getValue(){
        return this._topic.getValue().map(this._map);
    }
    [Symbol.iterator](){
        return this._topic.getValue().map(this._map)[Symbol.iterator]();
    }

}


export class ObjSetTopic<T extends SObject = SObject>{
    get initialized(): boolean{
        return this._topic.initialized;
    }
    onInit: Action<[T[]]> = new Action();
    onSet: Action<[T[]]> = new Action();
    onSet2: Action<[T[]]> = new Action();
    onAppend: Action<[T]> = new Action();
    onRemove: Action<[T]> = new Action();
    constructor(topic: SetTopic,map: (id:string)=>T){
        this._topic = topic;
        this._map = map;
        this._topic.onInit.add((value)=>this.onInit.invoke(value.map(this._map)));
        this._topic.onSet.add((value)=>this.onSet.invoke(value.map(this._map)));
        this._topic.onSet2.add((value)=>this.onSet2.invoke(value.map(this._map)));
        this._topic.onAppend.add((value)=>this.onAppend.invoke(this._map(value)));
        this._topic.onRemove.add((value)=>this.onRemove.invoke(this._map(value)));

        let originalOnSetAdd = this.onSet.add.bind(this.onSet);
        this.onSet.add = (callback) => {
            originalOnSetAdd(callback);
            if(this.getValue() !== null)
                callback(this.getValue());
        }
    }
    _topic: SetTopic;
    _map: (id:string)=>T;

    set(value:T[]){
        return this._topic.set(value.map(x=>x.id));
    }

    append(object:T){
        return this._topic.append(object.id);
    }
    remove(object:T){
        return this._topic.remove(object.id);
    }
    getValue(){
        return this._topic.getValue().map(this._map);
    }
    has(object:T){
        return this._topic.has(object.id);
    }
}


export class ObjDictTopic<K extends string|number|symbol,T extends SObject = SObject>{
    get initialized(): boolean{
        return this._topic.initialized;
    }
    onInit: Action<[Map<K,T>]> = new Action();
    onSet: Action<[Map<K,T>]> = new Action();
    onSet2: Action<[Map<K,T>,Map<K,T>]> = new Action();
    onAdd: Action<[K,T]> = new Action();
    onPop: Action<[K]> = new Action();
    onChangeValue: Action<[K,T]> = new Action();
    constructor(topic: DictTopic<K,string>,map: (id:string)=>T){
        this._topic = topic;
        this._map = map;
        this._topic.onInit.add((value)=>this.onInit.invoke(this._mapDict(value)));
        this._topic.onSet.add((value)=>this.onSet.invoke(this._mapDict(value)));
        this._topic.onSet2.add((old_value,new_value)=>this.onSet2.invoke(this._mapDict(old_value),this._mapDict(new_value)));
        this._topic.onAdd.add((key,value)=>this.onAdd.invoke(key,this._map(value)));
        this._topic.onPop.add((key:K)=>this.onPop.invoke(key));
        this._topic.onChangeValue.add((key,value)=>this.onChangeValue.invoke(key,this._map(value)));

        let originalOnSetAdd = this.onSet.add.bind(this.onSet);
        this.onSet.add = (callback) => {
            originalOnSetAdd(callback);
            if(this.getValue() !== null)
                callback(this.getValue());
        }
    }
    _topic: DictTopic<K,string>;
    _map: (id:string)=>T;
    _mapDict(dict:Map<K,string>){
        let new_dict:Map<K,T> = new Map();
        for(let [key,value] of dict.entries()){
            new_dict.set(key,this._map(value));
        }
        return new_dict;
    }
    
    set(value:Map<K,T>){
        let new_dict:Map<K,string> = new Map();
        for(let [key,value_] of value.entries()){
            new_dict.set(key,value_.id);
        }
        return this._topic.set(new_dict);
    }

    changeValue(key:K, value:T){
        return this._topic.changeValue(key, value.id);
    }
    
    add(key:K, value:T){
        return this._topic.add(key, value.id);
    }

    pop(key:K){
        return this._topic.pop(key);
    }

    getitem(){
        return this._mapDict(this._topic.getValue());
    }

    getValue(){
        return this._mapDict(this._topic.getValue());
    }

}