export class IdGenerator{
    static instance:IdGenerator = null;
    static generateId(): string{
        return IdGenerator.instance.next();
    }
    private _id = 0;
    private _clientId: string;
    constructor(clientId: string){
        this._clientId = clientId;
    }
    next(): string{
        this._id += 1;
        return this._clientId+'_'+this._id;
    }
}
