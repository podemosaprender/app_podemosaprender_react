//INFO: generar consultas a partir del esquema que devuelve graphene

import { fechaParaTexto } from '../services/pa-lib';
import { logmsg } from '../services/util';

let DBG=0; //U: para controlar cuanto loguea este modulo

export const GraphQlSchemaQuery='query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { ...FullType } directives { name description locations args { ...InputValue } } } } fragment FullType on __Type { kind name description fields(includeDeprecated: true) { name description args { ...InputValue } type { ...TypeRef } isDeprecated deprecationReason } inputFields { ...InputValue } interfaces { ...TypeRef } enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason } possibleTypes { ...TypeRef } } fragment InputValue on __InputValue { name description type { ...TypeRef } defaultValue } fragment TypeRef on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } } }'; //U: la misma que usa graphiQl de Django 

function simplificarType(t) { 
	if (t.ofType) {
		let t0= t.ofType.name!=null ? t : t.ofType;
		const r= {t: t0.ofType.name}
		if (['SCALAR','INPUT_OBJECT'].indexOf(t0.kind)===-1 ) { r.k= t0.kind; }
		return r;
	}
	else {
		return {t: t.name}
	}
}

export function schemaSimplificadoPara(unSchemaDeDjangoGrapheneRelay) {
	const schemaSimple= {tipos: {}, consultas: {}, modificaciones: {}};

	const s0= unSchemaDeDjangoGrapheneRelay.data.__schema.types;
	s0.forEach(t => {
		if (t.name.startsWith('__')) return;
		//console.log(t.name,t.kind,Object.keys(t))
		if (t.name==='Consultas') {
			t.fields.forEach( q => {
				const e= simplificarType(q.type);
				e.params= {};
				q.args.forEach(a => {
					e.params[a.name]= simplificarType(a.type);
				})
				schemaSimple.consultas[q.name]= e;
			});
		}
		else if (t.name==='Modificaciones') {
			t.fields.forEach( modif => {
				const e= simplificarType(modif.type);
				e.params= {};
				modif.args.forEach(a => {
					e.params[a.name]= simplificarType(a.type);
				})
				schemaSimple.modificaciones[modif.name]= e;
			});
		}
		else {
			const e= {};
			if (t.inputFields) {
				e.params= {};
				t.inputFields.forEach( infield => {
					e.params[infield.name]= simplificarType(infield.type);
				});
			}
			if (t.fields) {
				e.fields= {};
				t.fields.forEach( field => {
					const f = simplificarType(field.type);
					if (field.args) {
						f.params= {};
						field.args.forEach(a => {
							f.params[a.name]= simplificarType(a.type);
						})
					}
					e.fields[field.name]= f;
				});
			}
			schemaSimple.tipos[t.name]= e;
		}
	});

	return schemaSimple;
}

function generarQueryPartes(t0, partes, filtros, schema) {
	const tTop= schema.tipos[t0];
	DBG>7 && logmsg('DBG:generarQueryPartes pre edges',{t0,tTop,partes,filtros});

	if (tTop==null) { logmsg('ERR:generarQueryPartes tipo desconocido',{t0, tTop, partes}); }
	if (!tTop.fields) { logmsg('ERR:generarQueryPartes faltan fields',{t0, tTop, partes}); }
	if (!Array.isArray(partes)) { logmsg('ERR:generarQueryPartes partes no es un array',{t0, tTop, partes}); }

	let partesPendientes= [];
	let t= tTop;
	let r= ' ';
	partes.forEach(p => {
		if (Array.isArray(p)) {
			DBG>8 && logmsg('DBG:generarQueryPartes array',{t0,p,fields:tTop.fields});
			const field= t.fields[p[0]]; 
			if (field==null) { 
				DBG>7 && logmsg('DBG:generarQueryPartes array no hay field',{r,p0: p[0], t0, t, partes}); 
				partesPendientes.push(p);
			}
			else {
				const param_s= generarParams(field, filtros || {}, schema)
				r+=(p[0] + (param_s ? '('+param_s+')':'')+' { ');

				//DBG: console.log('generarQueryPartes array',p[0], t0,t);
				const tParte= field.t
				DBG>8 && logmsg('DBG:generarQueryPartes array',{tParte,t0,t,r});
				r+= generarQueryPartes(tParte, p.slice(1), filtros, schema);

				r+=' } ';
			}
		}
		else {
			//DBG: console.log('PARTE',p,xt);
			const field= t.fields[p]; 
			if (field==null) { 
				DBG>7 && logmsg('DBG:generarQueryPartes uno no hay field',{r,p0: p[0], t0, t, partes}); 
				partesPendientes.push(p);
			}
			else {
				r+= p+' ';
			}
		}
	});

	if (partesPendientes.length>0 && t.fields.edges) { 
		r+= ' edges { ' + generarQueryPartes(t.fields.edges.t, partesPendientes, filtros, schema) + ' } ';
	}
	else if (partesPendientes.length>0 && t.fields.node) { 
		r+= ' node { ' + generarQueryPartes(t.fields.node.t, partesPendientes, filtros, schema) + ' } ';
	}
	//TODO: alertar si aun asi quedaron pendientes!

	return r;
}

function generarUnParam(t,v) { //U: solo para escalares, no listas
	//TODO: otros tipos?
	const vs= 
		t.t==='DateTime'
		? JSON.stringify(new Date(v).toISOString())
		: t.t==='String'
		? JSON.stringify(v+'')
		: JSON.stringify(v);
	return vs;
}

function generarParams(t,valores,schema, path) {
	path= path || '';
	const def= typeof(t)=='string' ? (schema.consultas[t] || schema.tipos[t]) : t;
	if (def==null) { console.error('GraphQl params tipo desconocido',t); return ''; }
	const tipo_params= def.params;
	//DBG: console.log('generarParams',t, tipo_params);
	const param_s= Object.entries(tipo_params).map( ([k,t]) => {
		let v= valores[path+k] || valores['*'+k]; //U: si pongo *charlaTitulo filtra a todos los niveles
		//TODO: agregar prefijo
		if (v==null) { return '' } //A: no hay valor, no ponemos nada
		if (t==null) { console.error('GraphQl parámetro tipo desconocido',k,v,t,tipo_params); return ''; }
		//DBG: 
		const vs= t.k==='LIST'
			? '['+ v.map( v1 => generarUnParam(t,v1)).join(', ')+']'
			: generarUnParam(t,v);
		const txt= ` ${k}: ${vs} `	
		//DBG: console.log('pa-api-graphql generarParams k,t,v,txt', k,t,v,txt);
		return txt;
	}).join('');
	return param_s==='' ? null : param_s;
}


export function generarQuery(qm, filtros, schema) {
	const q= schema.consultas[qm[0]] || schema.tipos[qm[0]];
	if (q==null) { console.error('generarQuery consulta o tipo desconocido', qm[0], qm); return ''; }
	//DBG: console.log('generarQuery',qm,q);
	const param_s= generarParams(qm[0], filtros || {}, schema)
	const qs= (
		'{' +
			qm[0]+ 
			(param_s ? '('+param_s+')':'') 
			+' { ' + 
				generarQueryPartes(q.t, qm.slice(1), filtros, schema) + 
		'}}');
	//DBG: console.log('generarQuery',qs, qm);
	return qs;
}

export function generarMutationDfltQuery(modificacionId, schema) {
	const m= schema.modificaciones[modificacionId];
	const tm= schema.tipos[m.t];
	const tr= Object.keys(tm.fields).filter(k => k!=='clientMutationId')[0];
	//DBG: console.log('generarMutationDfltQuery',modificacionId,tr,tm, m);
	const qs=  generarQueryPartes(m.t,[[tr,'id']], {}, schema);
	//DBG: console.log('generarMutationDfltQuery',modificacionId, qs);
	return ' { ' +qs+' } ';
}

export function generarMutation(modificacionId, modificacionValores, query, schema) {
	const m= schema.modificaciones[modificacionId];
	const qs= query ? generarQuery(query, null, schema) : generarMutationDfltQuery(modificacionId, schema);
	const param_s= generarParams(m.params.input.t, modificacionValores, schema)
	const ms= `mutation m_1 { ${modificacionId}(input: { ${param_s} }) ${ qs } }`
	//console.log('generarMutation',ms, modificacionId, modificacionValores);
	return ms;
}

/* U:

MiSchema= schemaSimplificadoPara(require('./graphql_schema_de_django.json'));
//DBG: console.log(JSON.stringify(MiSchema,null,2))
//U: QUERIES: Quiero conseguir 
qm= [ 
	'textoLista', 
		'texto', 
		['deQuien','username'], 
		['charlaitemSet', 
			['charla', 
				'titulo',
				['deQuien','username']
			], 
			'orden'
		]
	]

console.log( generarQuery(qm, null, MiSchema) );

console.log( generarMutationDfltQuery('textoModificar', MiSchema));

console.log( generarMutation(
	'textoModificar', 
	{
		texto: `Parar #borrame_test_automatico ${new Date().toISOString()}`, 
		charlaTitulo: '#borrame_charla_1',
		orden: (new Date()+'').substr(15,10),
	},
	null,
	MiSchema
));

console.log( generarMutation(
	'textoModificar', 
	{
		texto: `Parar #borrame_test_automatico ${new Date().toISOString()}`, 
		charlaTitulo: '#borrame_charla_1',
		orden: (new Date()+'').substr(15,10),
	},
	['texto','id',['deQuien','username']],
	MiSchema
));

*/

export function simplificarRespuesta(res,consultaId) { //U: siguiendo convenciones para no repetir codigo por todos lados
	const res_data= res.data && res.data[consultaId];
	DBG>7 && logmsg('simplificarRespuesta',{consultaId, res_data});

	const simplificarDatos= (d0) => {
		if (d0.edges) { return d0.edges.map(simplificarDatos) }

		const d= d0.node || d0;	
		const r= {};
		Object.entries(d).forEach( ([k,v]) => {
			r[k]= (
				k.startsWith('fh') 
				? fechaParaTexto(v) 
				: k==='deQuien'
				? v.username
				: typeof(v)=='object'
				? simplificarDatos(v)
				: v
			);
		});
		return r;
	}
	//TODO: errores?
	const datos= {
		datos: simplificarDatos(res_data || []), 
		pageInfo: res_data?.pageInfo
	};
	//DBG: console.log('GraphQl simplificarRespuesta',consultaId, datos,res)
	return datos;
}

export default function GraphqlGeneradorPara(schemaDeGrapheneDjango) {
	const schema= schemaSimplificadoPara(schemaDeGrapheneDjango);
	return {
		schema,
		consulta: function consulta(qm, filtros) { return generarQuery(qm, filtros, schema); },
		modificacion: function modificacion(modificacionId, modificacionValores, query) { return generarMutation(modificacionId, modificacionValores, query, schema); },
		simplificarRespuesta: simplificarRespuesta,
	};
}

