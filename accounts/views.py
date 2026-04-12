from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from django.contrib import messages
from django.contrib.auth.models import User , auth
from main_app.models import patient , doctor
from hospital.models import UserProfile, Patient as HospitalPatient, Doctor as HospitalDoctor
from datetime import datetime

# Create your views here.


def _ensure_hospital_patient(user, patient_obj):
    UserProfile.objects.get_or_create(user=user, defaults={"role": UserProfile.ROLE_PATIENT})
    HospitalPatient.objects.get_or_create(
        user=user,
        defaults={
            "name": patient_obj.name,
            "dob": patient_obj.dob,
            "address": patient_obj.address,
            "mobile_no": patient_obj.mobile_no,
            "gender": patient_obj.gender,
        },
    )


def _ensure_hospital_doctor(user, doctor_obj):
    UserProfile.objects.get_or_create(user=user, defaults={"role": UserProfile.ROLE_DOCTOR})
    HospitalDoctor.objects.get_or_create(
        user=user,
        defaults={
            "name": doctor_obj.name,
            "dob": doctor_obj.dob,
            "address": doctor_obj.address,
            "mobile_no": doctor_obj.mobile_no,
            "gender": doctor_obj.gender,
            "registration_no": doctor_obj.registration_no,
            "year_of_registration": doctor_obj.year_of_registration,
            "qualification": doctor_obj.qualification,
            "state_medical_council": doctor_obj.State_Medical_Council,
            "specialization": doctor_obj.specialization,
        },
    )


   
def logout(request):
    auth.logout(request)
    request.session.pop('patientid', None)
    request.session.pop('doctorid', None)
    request.session.pop('adminid', None)
    return render(request,'homepage/index.html')




def sign_in_admin(request):
  

    if request.method == 'POST':

          username =  request.POST.get('username')
          password =  request.POST.get('password')
 
          user = auth.authenticate(username=username,password=password)

          if user is not None :
             
              try:
                 if ( user.is_superuser == True ) :
                     auth.login(request,user)
                     UserProfile.objects.get_or_create(user=user, defaults={"role": UserProfile.ROLE_ADMIN})

                     return redirect('admin_ui')
               
              except :
                  messages.info(request,'Please enter the correct username and password for a admin account.')
                  return redirect('sign_in_admin')


          else :
             messages.info(request,'Please enter the correct username and password for a admin account.')
             return redirect('sign_in_admin')


    else :
      return render(request,'admin/signin/signin.html')



def signup_patient(request):


    if request.method == 'POST':
      
      if request.POST['username'] and request.POST['email'] and  request.POST['name'] and request.POST['dob'] and request.POST['gender'] and request.POST['address']and request.POST['mobile']and request.POST['password']and request.POST['password1'] :

          username =  request.POST['username']
          email =  request.POST['email']

          name =  request.POST['name']
          dob =  request.POST['dob']
          gender =  request.POST['gender']
          address =  request.POST['address']
          mobile_no = request.POST['mobile']
          password =  request.POST.get('password')
          password1 =  request.POST.get('password1')

          if password == password1:
              if User.objects.filter(username = username).exists():
                messages.info(request,'username already taken')
                return redirect('signup_patient')

              elif User.objects.filter(email = email).exists():
                messages.info(request,'email already taken')
                return redirect('signup_patient')
                
              else :
                user = User.objects.create_user(username=username,password=password,email=email)   
                user.save()
                
                patientnew = patient(user=user,name=name,dob=dob,gender=gender,address=address,mobile_no=mobile_no)
                patientnew.save()
                _ensure_hospital_patient(user, patientnew)
                messages.info(request,'user created sucessfully')
                
              return redirect('sign_in_patient')

          else:
            messages.info(request,'password not matching, please try again')
            return redirect('signup_patient')

      else :
        messages.info(request,'Please make sure all required fields are filled out correctly')
        return redirect('signup_patient') 


    
    else :
      return render(request,'patient/signup_Form/signup.html')



def sign_in_patient(request):
  

    if request.method == 'POST':

          username =  request.POST.get('username')
          password =  request.POST.get('password')
 
          user = auth.authenticate(username=username,password=password)

          if user is not None :
             
              try:
                 if ( user.patient.is_patient == True ) :
                     auth.login(request,user)

                     request.session['patientusername'] = user.username
                     _ensure_hospital_patient(user, user.patient)

                     return redirect('patient_ui')
               
              except :
                  messages.info(request,'invalid credentials')
                  return redirect('sign_in_patient')


          else :
             messages.info(request,'invalid credentials')
             return redirect('sign_in_patient')


    else :
      return render(request,'patient/signin_page/index.html')


def savepdata(request,patientusername):

  if request.method == 'POST':
    name =  request.POST['name']
    dob =  request.POST['dob']
    gender =  request.POST['gender']
    address =  request.POST['address']
    mobile_no = request.POST['mobile_no']
    print(dob)
    dobdate = datetime.strptime(dob,'%Y-%m-%d')

    puser = User.objects.get(username=patientusername)

    patient.objects.filter(pk=puser.patient).update(name=name,dob=dobdate,gender=gender,address=address,mobile_no=mobile_no)
    HospitalPatient.objects.update_or_create(
        user=puser,
        defaults={"name": name, "dob": dobdate, "gender": gender, "address": address, "mobile_no": mobile_no},
    )

    return redirect('pviewprofile',patientusername)





#doctors account...........operations......
    

def signup_doctor(request):

    if request.method == 'GET':
    
       return render(request,'doctor/signup_Form/signup.html')


    if request.method == 'POST':
      
      if request.POST['username'] and request.POST['email'] and  request.POST['name'] and request.POST['dob'] and request.POST['gender'] and request.POST['address']and request.POST['mobile'] and request.POST['password']and request.POST['password1']  and  request.POST['registration_no'] and  request.POST['year_of_registration'] and  request.POST['qualification'] and  request.POST['State_Medical_Council'] and  request.POST['specialization'] :

          username =  request.POST['username']
          email =  request.POST['email']

          name =  request.POST['name']
          dob =  request.POST['dob']
          gender =  request.POST['gender']
          address =  request.POST['address']
          mobile_no = request.POST['mobile']
          registration_no =  request.POST['registration_no']
          year_of_registration =  request.POST['year_of_registration']
          qualification =  request.POST['qualification']
          State_Medical_Council =  request.POST['State_Medical_Council']
          specialization =  request.POST['specialization']
          
          password =  request.POST.get('password')
          password1 =  request.POST.get('password1')

          if password == password1:
              if User.objects.filter(username = username).exists():
                messages.info(request,'username already taken')
                return redirect('signup_doctor')

              elif User.objects.filter(email = email).exists():
                messages.info(request,'email already taken')
                return redirect('signup_doctor')
                
              else :
                user = User.objects.create_user(username=username,password=password,email=email)   
                user.save()
                
                doctornew = doctor( user=user, name=name, dob=dob, gender=gender, address=address, mobile_no=mobile_no, registration_no=registration_no, year_of_registration=year_of_registration, qualification=qualification, State_Medical_Council=State_Medical_Council, specialization=specialization )
                doctornew.save()
                _ensure_hospital_doctor(user, doctornew)
                messages.info(request,'user created sucessfully')
                print("doctorcreated")
                
              return redirect('sign_in_doctor')

          else:
            messages.info(request,'password not matching, please try again')
            return redirect('signup_doctor')

      else :
        messages.info(request,'Please make sure all required fields are filled out correctly')
        return redirect('signup_doctor') 






def sign_in_doctor(request):

    if request.method == 'GET':
    
       return render(request,'doctor/signin_page/index.html')

  
    if request.method == 'POST':

          username =  request.POST.get('username')
          password =  request.POST.get('password')
 
          user = auth.authenticate(username=username,password=password)

          if user is not None :
              
              try:

                if ( user.doctor.is_doctor == True ) :
                  auth.login(request,user)
                  
                  request.session['doctorusername'] = user.username
                  _ensure_hospital_doctor(user, user.doctor)

                  return redirect('doctor_ui')
               
              except :
                  messages.info(request,'invalid credentials')
                  return redirect('sign_in_doctor')

          else :
             messages.info(request,'invalid credentials')
             return redirect('sign_in_doctor')


    else :
      return render(request,'doctor/signin_page/index.html')





def saveddata(request,doctorusername):

  if request.method == 'POST':

    name =  request.POST['name']
    dob =  request.POST['dob']
    gender =  request.POST['gender']
    address =  request.POST['address']
    mobile_no = request.POST['mobile_no']
    registration_no =  request.POST['registration_no']
    year_of_registration =  request.POST['year_of_registration']
    qualification =  request.POST['qualification']
    State_Medical_Council =  request.POST['State_Medical_Council']
    specialization =  request.POST['specialization']
    

    
    dobdate = datetime.strptime(dob,'%Y-%m-%d')
    yor = datetime.strptime(year_of_registration,'%Y-%m-%d')

    duser = User.objects.get(username=doctorusername)

    doctor.objects.filter(pk=duser.doctor).update( name=name, dob=dob, gender=gender, address=address, mobile_no=mobile_no, registration_no=registration_no, year_of_registration=yor, qualification=qualification, State_Medical_Council=State_Medical_Council, specialization=specialization )
    HospitalDoctor.objects.update_or_create(
        user=duser,
        defaults={
            "name": name,
            "dob": dobdate,
            "gender": gender,
            "address": address,
            "mobile_no": mobile_no,
            "registration_no": registration_no,
            "year_of_registration": yor,
            "qualification": qualification,
            "state_medical_council": State_Medical_Council,
            "specialization": specialization,
        },
    )

    return redirect('dviewprofile',doctorusername)
