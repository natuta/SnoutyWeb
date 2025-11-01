
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Especie } from '../../shared/models/especie';

@Component({
  selector: 'app-especie-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './especie-form.html'
})
export default class EspecieForm {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id: number | null = null;
  model: Especie = { nombre: '' };
  title = 'Nueva especie';

  ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if(id){
      this.id = +id;
      this.title = 'Editar especie';
      this.api.getEspecie(this.id).subscribe(data => this.model = data);
    }
  }
  save(){
    const req = this.id ? this.api.updateEspecie(this.id, this.model) : this.api.createEspecie(this.model);
    req.subscribe({ next: _ => this.router.navigateByUrl('/especies') });
  }
}
