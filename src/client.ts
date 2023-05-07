import { ChatroomClient, EventTopic, SetTopic, Topic } from "chatroom-client/src"
import { SObject } from "./sobject";
import { Constructor } from "chatroom-client/src/utils"

export class ObjectSyncClient{
    private readonly chatroom;
    private readonly objects: Map<string,SObject> = new Map();
    private object_ids: SetTopic|null = null;
    private createObjectEvent: EventTopic|null = null;
    constructor(host: string){
        this.chatroom = new ChatroomClient(host);
        this.chatroom.onConnected(() => {
            this.defineTransitions();
        });
    }

    private defineTransitions(): void{
        // callbacks go brrrr

        this.object_ids = this.chatroom.getTopic('object_ids',SetTopic);
        this.object_ids.onAppend.add(
            (id: string) => {
                const obj = new SObject(this, id);
                this.objects.set(id,obj);
            }
        );
        this.object_ids.onRemove.add(
            (id: string) => {
                const obj = this.objects.get(id)!;
                obj.onDestroy();
                this.objects.delete(id);
            }
        );

        // this.createObjectEvent = this.chatroom.getTopic('create_object',EventTopic);
        // this.createObjectEvent.onEmit.add(
        //     (data: {parent_id: number}) => {
        //         const id = this.object_ids!.append();
        //         this.objects.get(id)!.parent_id.set(data.parent_id);
        //     }
        // );
        this.chatroom.on('create_object', 
            // unpack data
            ({id,parent_id}:{'id':string,'parent_id':string}) => {
                // Simulate what the server would do

            }
        );
    }
    
    public createObject(parent:SObject): void{
        this.createObjectEvent!.emit({parent_id:parent.id});
    }

    /* Encapsulate ChatRoom */
    public getTopic<T extends Topic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        return this.chatroom.getTopic(topicName,topicType);
    }
    

}