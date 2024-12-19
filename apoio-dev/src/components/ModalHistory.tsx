import { useEffect, useState, useCallback, useRef } from 'react'
import ReactPaginate from "react-paginate"
import axios from '../api/axios'
import debounce from 'lodash.debounce'
import { formatValue } from 'react-currency-input-field'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'

interface apoios {
  i_apoio: number
  nome: string
  vl_recibo_str: string
  dt_sistema_f: string
  flag: string
  pagamento: string
  vl_recibo:string
  pgto_local:string
  obs: string
}

function ModalHistory({setHistory, pagador, setHistoryUser, history, historyUser}:any) {
  const [pageCount, setpageCount] = useState(0)
  const [items, setItems] = useState<Array<apoios>>([])
  const [search, setSearch] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')
  const inputSearch = useRef<HTMLInputElement>(null)
  const limit = 10

  const getApoios = async (currentPage: number = 1, search: string = '') => {
    let res = await axios.get(`/api/apoio/historico?page=${currentPage}&limit=${limit}&search=${search}`)
    setpageCount(Math.ceil(res.data.total / limit))
    setItems(res.data.itens)
    setItems(res.data.itens)
  }

  const handlePageClick = async (data: any) => {
    let currentPage = data.selected + 1
    await getApoios(currentPage, inputValue)
  }
  const handleExcluir = async (id:number) => {
    try {
      Swal.fire({
        title:'Deseja cancelar essa compra?',
        confirmButtonText:'Sim',
        cancelButtonText:'Não',
        showCancelButton:true,
        showConfirmButton:true,
        input: 'textarea',
        inputLabel: 'Motivo:',
      }).then(async (result)=>{
        if(result.isConfirmed) {
          console.log(result);
          
          await axios.post('/api/apoio/cancel-recibo', {
            i_recibo:id,
            flag:'C',
            obs: result.value || ""
          })
          await getApoios(1)
        } else if(result.isDismissed) {
          Swal.close()
        }
      })
      
    } catch (error) {
      
    }
  }
  const handleReload = async () => {
    try {
      let res = await axios.get('/api/apoio/atualizacao-pix')
      toast.success(res.data.retorno, {autoClose:2000})
      history ? setHistory(false) : setHistoryUser(false)
    } catch (error) {
      
    }
  }

  const debouncedCallback = useCallback(
    debounce(async (e) => {
      setInputValue(e.target.value)
      setSearch(e.target.value.trim())
      if (e.target.value.trim() && e.target.value.trim().length >= 3) await getApoios(1, e.target.value.trim())
      if (!e.target.value.trim()) await getApoios()
    }, 1500), []
  )

  useEffect(() => {
    (async () => {
      if (pagador?.nome && historyUser) {
        await getApoios(1, pagador?.nome.trim())
        setInputValue(pagador?.nome)
        // inputSearch.current?.value = 'asdsadsa'
      } else {
        await getApoios()
      }

    })()
  }, [historyUser, history])

  const renderFlag = useCallback((flag: string, obs: string) => {
    switch(flag) {
      case 'A':
        return <span className="badge text-bg-primary" >Aberto</span>

      case 'P':
        return <span className="badge text-bg-success" >Pago</span>

      case 'C':
        return <span className="badge text-bg-danger" title={obs} >Cancelado</span>

      default:
        return null;

    }
  }, []);

  const renderFormaPag = useCallback((pagamento: string, pgto:string) => {
    switch(pagamento) {
      case 'S':
        return 'SATC' + pgto

      case 'D':
        return 'Dinheiro' + pgto

      case 'P':
        return 'PIX' + pgto

      case 'C':
        return 'Conta' + pgto

      default:
        return null;

    }
  }, []);

  return (
    <div className="w-100 h-100 d-flex justify-content-center align-items-center" style={{position:'absolute', top:0, zIndex:999, backgroundColor:'rgba(0,0,0,0.2)'}}>
      <div style={{width:960, backgroundColor:'white'}} className='shadow-lg rounded-5 row py-3' >
        <div className="d-flex justify-content-between" style={{height:50}}>
          <div className='d-flex align-items-center fs-4 ms-3'>Histórico</div>
          {history ?
            <button className="btn btn-white" onClick={()=>{setHistory(false)}}><i className="bi bi-x-lg"></i></button>
            :
            <button className="btn btn-white" onClick={()=>{ setHistoryUser(false)}}><i className="bi bi-x-lg"></i></button>
          }
        </div>
        <div className="px-4 col-12 d-flex justify-content-between mb-2">
          <button onClick={handleReload} className='btn btn-light border border-secondary col-2 d-flex align-items-center justify-content-center gap-2'>
            Recarregar <i className='bi bi-arrow-clockwise'></i>
          </button>
          <input
            className="form-control form-control-sm w-50"
            type="search"
            value={inputValue}
            onChange={(e)=>{debouncedCallback(e); setInputValue(e.target.value)}}
            placeholder="Buscar..."
            ref={inputSearch}
          />
        </div>
        <div className="px-4" style={{maxHeight:"60vh", overflowX:'hidden'}}>
          <table className="table">
            <thead>
              <tr className="table-light">
                <th className='text-center'>#</th>
                <th>Nome</th>
                <th className="text-center">Situação / Forma</th>
                <th className="text-center">Total</th>
                <th className="text-center">Data</th>
                <th className="text-center">Recibo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(apoio => (
                <tr key={apoio.i_apoio}>
                  <th scope="row" className="text-center">{apoio.i_apoio}</th>
                  <td style={{wordBreak:'break-all'}}>{apoio.nome}</td>
                  <td className="text-center">
                    {renderFlag(apoio.flag, apoio.obs)} / {renderFormaPag(apoio.pagamento, apoio.pgto_local)}
                  </td>
                  <td className="text-center">{apoio.pagamento === 'S' ? formatValue({value: apoio.vl_recibo, groupSeparator: '.', decimalSeparator: ',', prefix: 'R$ ', decimalScale: 3}) : apoio.vl_recibo_str}</td>
                  <td className="text-center">{apoio.dt_sistema_f}</td>
                  <td className="text-center">
                    {apoio.flag != 'C' &&
                      <a className="btn btn-sm" target="_blank" href={`${import.meta.env.VITE_API_BASE_URL}/api/apoio/recibo/pdf/${apoio.i_apoio}`} title="Recibo">
                        <i className="bi bi-receipt"></i>
                      </a>
                    }
                  </td>
                  <td>
                    {(pagador?.nome.toUpperCase() === 'MICHELE PAVAN TOMAZI' || 
                    pagador?.nome.toUpperCase() === 'MARIA DO CARMO DE MEDEIROS' || 
                    pagador?.nome.toUpperCase() === 'CLAUDIA DE PELEGRINI ESMERALDINO' || 
                    pagador?.nome.toUpperCase() === 'GISELE REGINA BIAVA' || 
                    pagador?.nome.toUpperCase() === 'MARISA MARQUES') &&
                    apoio.flag != 'C' && apoio.flag != 'P' &&
                      <button className="btn btn-sm" onClick={()=>{handleExcluir(apoio.i_apoio)}} title="Recibo">
                        <i className="bi bi-trash3" style={{color: "rgb(230, 65, 92)"}}></i>
                      </button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4">
          <ReactPaginate
            previousLabel={false}
            nextLabel={false}
            breakLabel={"..."}
            pageCount={pageCount}
            marginPagesDisplayed={2}
            pageRangeDisplayed={3}
            onPageChange={handlePageClick}
            containerClassName={"pagination pagination-sm justify-content-end"}
            pageClassName={"page-item"}
            pageLinkClassName={"page-link"}
            breakClassName={"page-item"}
            breakLinkClassName={"page-link"}
            activeClassName={"active"}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalHistory