import { useEffect, useMemo } from "react"

const Title=[
    {
        "zh": "這個圖紋不是誰都可以擁有。",
        "en": "These motifs were historically restricted, not available to all."
    },
    {
        "zh": "過去有人因為紋手被懲罰、羞辱或禁止。",
        "en": "At certain times in history, tattooing was subject to punishment, stigma, or prohibition."
    }
]
export default function Outro(){

    const index = useMemo(() => Math.floor(Math.random() * Title.length), []);

    
    return (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-4 text-center p-4 text-white">
            <h1 className="opacity-0 outro-text text-4xl">{Title[index].zh}</h1>
            <h2 className="opacity-0  outro-text text-xl max-w-[60%]">{Title[index].en}</h2>
        </div>
    )

}