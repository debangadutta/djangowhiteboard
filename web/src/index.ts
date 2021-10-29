type Point = [number, number];

type BoardPath = {
    type : "path";
    points: Point[];
};

type BoardObject = BoardPath

type ReceivedWebsocketMessage = {
    "type": "INITIAL_DATA",
    "data":{
        "objects":BoardObject[]
    }
}

class Board{
    objects: BoardObject[] = [];
    currentDrawingObject?: BoardObject;
    context: CanvasRenderingContext2D;
    elementPosition: Point;
    socket: WebSocket;
    constructor(private element: HTMLCanvasElement, private boardId: string ){
        this.context = element.getContext("2d");
        const{x, y} = element.getBoundingClientRect();
        this.elementPosition = [x, y];
        const scheme = window.location.protocol === "http:" ? "ws" : "wss"; 
        this.socket = new WebSocket(`${scheme}://${window.location.host}/board/${this.boardId}`);
        this.socket.addEventListener("message", this.onSocketMessage)
    }
    onSocketMessage = (event: MessageEvent)=>{
        const data = event.data;
        const payload = JSON.parse(data) as ReceivedWebsocketMessage;
        if (payload.type === "INITIAL_DATA"){
            this.objects = payload.data.objects;
            this.draw();
        }
    }
    sendBoardObject = (obj: BoardObject)=> {
        this.socket.send(JSON.stringify({
            "type": "ADD_OBJECT",
            "data": {
                "object": this.currentDrawingObject
            }
        }));
    }

    onMouseDown = (event: MouseEvent) => {
        const x = event.clientX - this.elementPosition[0];
        const y = event.clientY - this.elementPosition[1];
        this.currentDrawingObject= {
            type: "path",
            points: [[x, y]]
        };
        this.draw();
    };
    onMouseUp = () => {
        if(this.currentDrawingObject){
            this.objects.push(this.currentDrawingObject)
            this.sendBoardObject(this.currentDrawingObject);
            this.currentDrawingObject= undefined; //clears
            this.draw();
        }
    };
    onMouseMove = (event: MouseEvent) => {
        const x = event.clientX - this.elementPosition[0];
        const y = event.clientY - this.elementPosition[1];
        if(!this.currentDrawingObject) return;
        if (this.currentDrawingObject.type === "path"){
            this.currentDrawingObject.points.push([x, y]);
        }
        this.draw();
    };

    draw = () => {
        const {context, element} = this;
        const{ width, height} = element.getBoundingClientRect();
        context.clearRect(0,0, width, height);
        for (const obj of this.objects) {
            this.drawObject(obj);
        }
        if (this.currentDrawingObject){
            this.drawObject(this.currentDrawingObject);
        }
    };

    drawObject = (obj: BoardObject) => {
        if(obj.type === "path"){
            this.drawPath(obj)
        }
    }

    drawPath = (obj: BoardPath) => {
        if (obj.points.length === 0 ) return;
        const context = this.context;
        context.closePath();
        context.beginPath();
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        const firstPoint = obj.points[0];
        const rest = obj.points.slice(1);
        context.moveTo(firstPoint[0], firstPoint[1]);
        for (const point of rest) {
            const [x, y]= point;
            context.lineTo(x, y);
        }
        context.stroke();     
    }

    run = () => {
        this.element.addEventListener("mousedown", this.onMouseDown);
        this.element.addEventListener("mouseup", this.onMouseUp);
        this.element.addEventListener("mousemove", this.onMouseMove);
        this.element.addEventListener("mouseleave", this.onMouseUp);
        this.draw();
        
    };
}

const element = document.getElementById("foo") as HTMLCanvasElement;
const board = new Board(element, (window as any).boardId);
board.run()