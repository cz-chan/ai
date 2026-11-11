function returnLog(input: string): string {
	return input;
}
console.log(returnLog("hola mundo"));

const myApp = document.getElementById("response") as HTMLPreElement;

myApp.innerText = JSON.stringify(returnLog("hola"));
