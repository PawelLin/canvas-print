class Html2Pdf {
    constructor (id, opt = {}) {
        this.pageFormats = { 'a4': [595.28, 841.89], 'a2': [1190.55, 1683.78] }
        this.opt = {
            margin: [10, 10],
            filename: 'file.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            scale: 2,
            type: 'a4',
            maxheight: 15000
        }
        Object.assign(this.opt, opt)
        this.id = id
        this.pdfWidth = this.pageFormats[this.opt.type][0] - (2 * this.opt.margin[0])
        this.pdfHeight = this.pageFormats[this.opt.type][1] - (2 * this.opt.margin[1])
        this.pageWidth = Math.ceil(this.pdfWidth * (1 + (1 / 3)) * this.opt.scale)
        this.pageHeight = Math.ceil(this.pdfHeight * (1 + (1 / 3)) * this.opt.scale)
        this.dom = {}
        this.pages = []
    }
    // 复制绘制的html
    cloneNode () {
        let styles = {
            position: 'fixed',
            width: `${this.pageWidth / this.opt.scale}px`,
            top: 0,
            left: 0,
            height: 'auto',
            backgroundColor: 'white',
            zIndex: -1
        }
        let target = document.getElementById(this.id)
        let html2pdf = document.createElement('div')
        let _html2pdf = document.createElement('div')
        let height = 0
        let div = document.createElement('div')
        html2pdf.setAttribute('id', 'html2pdf')
        _html2pdf.innerHTML = target.innerHTML
        let childs = _html2pdf.children
        for (let key in styles) {
            html2pdf.style[key] = styles[key]
            _html2pdf.style[key] = styles[key]
        }
        // 重新组合每个子节点，避免单个子节点高度过长
        Array.from(target.children).forEach((dom, index) => {
            height += dom.offsetHeight
            if (height < this.opt.maxheight) {
                div.appendChild(childs[0])
            } else {
                if (!div.children.length) div.appendChild(childs[0])
                html2pdf.appendChild(div)
                div = document.createElement('div')
                height = 0
            }
            if (target.children.length - index === 1) {
                if (!div.children.length) div.appendChild(childs[0])
                html2pdf.appendChild(div)
            }
        })
        _html2pdf = null
        document.body.appendChild(html2pdf)
        return this
    }
    // 绘制html
    drawHtmlCanvas () {
        let doms = Array.from(document.querySelectorAll('#html2pdf > div')).map(dom => html2canvas(dom, { scale: this.opt.scale }))
        return Promise.all(doms).then(canvases => {
            canvases.forEach(canvas => {
                this.drawPageCanvas(canvas)
            })
        })
    }
    // 绘制每一页pdf的canvas
    drawPageCanvas (canvas) {
        // if (canvas.width > this.pageWidth) {
        //     let ratio = this.pageWidth / canvas.width
        //     let { pageCanvas, pageCtx } = this.drawCanvas(this.pageWidth, canvas.height * ratio)
        //     pageCtx.drawImage(canvas, 0, 0, pageCanvas.width, pageCanvas.height)
        //     canvas = pageCanvas
        // }
        let canvasHeight = canvas.height
        let height = 0
        if (this.dom.canvas) {
            this.dom.ctx.drawImage(canvas, 0, this.dom.height, canvas.width, canvas.height)
            canvasHeight = canvasHeight - (this.pageHeight - this.dom.height)
            if (canvasHeight >= 0) {
                height = canvasHeight - canvas.height
                this.dom.canvas = null
            } else {
                this.dom.height += canvas.height
            }
        }
        for (canvasHeight; canvasHeight >= this.pageHeight; canvasHeight -= this.pageHeight) {
            let { pageCanvas, pageCtx } = this.drawCanvas()
            pageCtx.drawImage(canvas, 0, height, canvas.width, canvas.height)
            height -= this.pageHeight
            this.pages.push(pageCanvas)
        }
        if (canvasHeight > 0 && !this.dom.canvas) {
            let { pageCanvas, pageCtx } = this.drawCanvas()
            pageCtx.drawImage(canvas, 0, height, canvas.width, canvas.height)
            this.dom.canvas = pageCanvas
            this.dom.ctx = pageCtx
            this.dom.height = canvas.height + height
            this.pages.push(pageCanvas)
        }
    }
    // 绘制单个canvas
    drawCanvas (width, height) {
        let pageCanvas = document.createElement('canvas')
        let pageCtx = pageCanvas.getContext('2d')
        pageCanvas.width = width || this.pageWidth
        pageCanvas.height = height || this.pageHeight
        pageCanvas.style.width = `${pageCanvas.width / this.opt.scale}px`
        pageCanvas.style.height = `${pageCanvas.height / this.opt.scale}px`
        pageCtx.fillStyle = 'white'
        pageCtx.fillRect(0, 0, this.pageWidth, this.pageHeight)
        return { pageCanvas, pageCtx }
    }
    draw (fn) {
        this.cloneNode().drawHtmlCanvas().then(() => {
            this.save()
            document.body.removeChild(document.getElementById('html2pdf'))
            fn && fn()
        })
        // this.cloneNode()
    }
    save () {
        let pdf = new jsPDF('', 'pt', this.opt.type)
        for (let i = 0; i < this.pages.length; i++) {
            if (i) pdf.addPage()
            pdf.addImage(this.pages[i].toDataURL(`image/${this.opt.image.type}`, this.opt.image.quality), this.opt.image.type, this.opt.margin[1], this.opt.margin[0], this.pdfWidth, this.pdfHeight)
        }
        pdf.save(this.opt.filename)
    }
}

let htmlpdf = (id, opt) => {
    return new Html2Pdf(id, opt)
}
